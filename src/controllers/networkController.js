const { query, pool } = require('../config/db');
const mikrotik = require('../services/mikrotik');
const { buildSyncPreview, isSecretActive } = require('../services/mikrotik/secretPolicy');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const RECONCILE_CONFIRMATION = 'WINBOX_SOURCE_OF_TRUTH';

const getTelemetry = async (req, res, next) => {
  try {
    // 1. Ambil distribusi profil dari database
    const profilesResult = await query(`
      SELECT mikrotik_profile as name, COUNT(*) as count 
      FROM clients 
      WHERE is_active = TRUE 
      GROUP BY mikrotik_profile
      ORDER BY count DESC
    `);

    // 2. Ambil data hardware dari MikroTik Service
    const systemResource = await mikrotik.getSystemResource();
    const trafficStats = await mikrotik.getTrafficStats();

    res.status(200).json({
      status: 'success',
      data: {
        profiles: profilesResult.rows,
        telemetry: {
          cpuLoad: systemResource.cpuLoad,
          memoryUsage: systemResource.memoryUsage,
          uptime: systemResource.uptime,
          rxTraffic: trafficStats.rxTraffic,
          txTraffic: trafficStats.txTraffic,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const previewMikrotikSync = async (req, res, next) => {
  try {
    const result = await mikrotik.previewPPPoESync();

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const reconcileFromMikrotik = async (req, res, next) => {
  if (req.body?.confirmation !== RECONCILE_CONFIRMATION) {
    return res.status(400).json({
      status: 'error',
      message: 'Konfirmasi rekonsiliasi Winbox tidak valid.'
    });
  }

  let dbClient;

  try {
    const secrets = await mikrotik.getPPPoESecrets();

    const invalidSecrets = secrets.filter((secret) => (
      typeof secret.name !== 'string'
      || secret.name.length === 0
      || secret.name.length > 50
      || String(secret.profile || 'default').length > 50
    ));

    if (invalidSecrets.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `${invalidSecrets.length} PPP Secret memiliki nama atau profil melebihi batas CRM.`
      });
    }

    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    const clientsResult = await dbClient.query(`
      SELECT id, fullname, mikrotik_profile, mikrotik_router_profile, is_active, is_archived
      FROM clients
      FOR UPDATE
    `);
    const packagesResult = await dbClient.query('SELECT name, monthly_fee FROM internet_packages');
    const packageFees = new Map(packagesResult.rows.map((pkg) => [pkg.name, pkg.monthly_fee]));
    const existingById = new Map(clientsResult.rows.map((client) => [client.id, client]));
    const plan = buildSyncPreview(clientsResult.rows, secrets);

    for (const secret of secrets) {
      const routerProfile = secret.profile || 'default';
      const desiredProfile = routerProfile.toUpperCase() === 'EXPIRED' ? 'default' : routerProfile;
      const active = isSecretActive(secret);
      const existing = existingById.get(secret.name);

      if (existing) {
        await dbClient.query(`
          UPDATE clients
          SET mikrotik_profile = CASE
                WHEN UPPER($2) = 'EXPIRED' THEN mikrotik_profile
                ELSE $2
              END,
              mikrotik_router_profile = $2,
              is_active = $3,
              is_archived = FALSE,
              archived_at = NULL,
              mikrotik_last_seen_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [secret.name, routerProfile, active]);
        continue;
      }

      const temporaryPortalPassword = crypto.randomBytes(24).toString('base64url');
      const passwordHash = await bcrypt.hash(temporaryPortalPassword, 10);
      const monthlyFee = packageFees.get(desiredProfile) || 0;

      await dbClient.query(`
        INSERT INTO clients (
          id, qr_token, fullname, whatsapp, address,
          mikrotik_profile, mikrotik_router_profile, monthly_fee,
          billing_cycle_date, auto_isolir, is_active, is_archived,
          mikrotik_last_seen_at, password_hash
        ) VALUES ($1, $2, $3, '', '', $4, $5, $6, 1, TRUE, $7, FALSE, CURRENT_TIMESTAMP, $8)
      `, [
        secret.name,
        crypto.randomUUID(),
        secret.name,
        desiredProfile,
        routerProfile,
        monthlyFee,
        active,
        passwordHash
      ]);
    }

    const archiveIds = plan.changes
      .filter((change) => change.action === 'ARCHIVE_MISSING_IN_ROUTER')
      .map((change) => change.clientId);

    if (archiveIds.length > 0) {
      await dbClient.query(`
        UPDATE clients
        SET is_archived = TRUE,
            archived_at = CURRENT_TIMESTAMP,
            is_active = FALSE,
            mikrotik_last_seen_at = NULL
        WHERE id = ANY($1::varchar[])
      `, [archiveIds]);
    }

    await dbClient.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: `Data CRM disesuaikan dengan Winbox tanpa mengubah RouterOS: ${plan.toImport} diimpor, ${plan.toUpdate} diperbarui, ${plan.toArchive} diarsipkan.`,
      data: {
        ...plan,
        changes: undefined
      }
    });
  } catch (error) {
    if (dbClient) await dbClient.query('ROLLBACK');
    next(error);
  } finally {
    if (dbClient) dbClient.release();
  }
};

const getProfiles = async (req, res, next) => {
  try {
    const profiles = await mikrotik.getAllProfiles();
    res.status(200).json({ status: 'success', data: profiles });
  } catch (error) {
    next(error);
  }
};

const createProfile = async (req, res, next) => {
  try {
    await mikrotik.createProfile(req.body);
    res.status(201).json({ status: 'success', message: 'Profil berhasil dibuat' });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params; // Using name as ID
    await mikrotik.updateProfile(id, req.body);
    res.status(200).json({ status: 'success', message: 'Profil berhasil diupdate' });
  } catch (error) {
    next(error);
  }
};

const deleteProfile = async (req, res, next) => {
  try {
    const { id } = req.params; // Using name as ID
    
    // Check if it's default
    if (id === 'default' || id === 'default-encryption') {
      return res.status(400).json({ status: 'error', message: 'Profil default tidak bisa dihapus' });
    }
    
    await mikrotik.deleteProfile(id);
    res.status(200).json({ status: 'success', message: 'Profil berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

const getIPPools = async (req, res, next) => {
  try {
    const pools = await mikrotik.getIPPools();
    res.status(200).json({ status: 'success', data: pools });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  getTelemetry, 
  previewMikrotikSync,
  reconcileFromMikrotik,
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getIPPools
};
