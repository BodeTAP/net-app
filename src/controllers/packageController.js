const { query } = require('../config/db');
const mikrotik = require('../services/mikrotik');
const crypto = require('crypto');

const getPackages = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM internet_packages ORDER BY monthly_fee ASC');
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    next(error);
  }
};

const createPackage = async (req, res, next) => {
  try {
    const { name, monthly_fee, rate_limit, is_active } = req.body;
    const id = `PKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    // 1. Create in Database
    const result = await query(
      `INSERT INTO internet_packages (id, name, monthly_fee, rate_limit, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, name, monthly_fee || 0, rate_limit || '', is_active !== false]
    );

    // 2. Create in Mikrotik
    try {
      await mikrotik.createProfile({
        name: name,
        rateLimit: rate_limit || '',
        localAddress: '',
        remoteAddress: ''
      });
    } catch (err) {
      console.error(`[MIKROTIK SYNC ERROR] Failed to create profile: ${err.message}`);
    }

    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, monthly_fee, rate_limit, is_active } = req.body;

    // Get original package to know the old name for Mikrotik update
    const oldRes = await query('SELECT name FROM internet_packages WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Package not found' });
    }
    const oldName = oldRes.rows[0].name;

    // 1. Update Database (Package)
    const result = await query(
      `UPDATE internet_packages 
       SET name = $1, monthly_fee = $2, rate_limit = $3, is_active = $4
       WHERE id = $5 RETURNING *`,
      [name, monthly_fee, rate_limit, is_active, id]
    );

    // 2. Cascade update to all clients using this profile
    await query(
      `UPDATE clients SET monthly_fee = $1, mikrotik_profile = $2 WHERE mikrotik_profile = $3`,
      [monthly_fee, name, oldName]
    );

    // 2. Update Mikrotik
    try {
      await mikrotik.updateProfile(oldName, {
        name: name,
        rateLimit: rate_limit
      });
    } catch (err) {
      console.error(`[MIKROTIK SYNC ERROR] Failed to update profile: ${err.message}`);
    }

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deletePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const oldRes = await query('SELECT name FROM internet_packages WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Package not found' });
    }
    const oldName = oldRes.rows[0].name;

    // 1. Delete from Database
    await query('DELETE FROM internet_packages WHERE id = $1', [id]);

    // 2. Delete from Mikrotik
    try {
      await mikrotik.deleteProfile(oldName);
    } catch (err) {
      console.error(`[MIKROTIK SYNC ERROR] Failed to delete profile: ${err.message}`);
    }

    res.status(200).json({ status: 'success', message: 'Package deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const syncFromMikrotik = async (req, res, next) => {
  try {
    const profiles = await mikrotik.getAllProfiles();
    
    // Get existing from DB
    const existingRes = await query('SELECT name FROM internet_packages');
    const existingNames = existingRes.rows.map(r => r.name);
    
    let imported = 0;
    
    for (const p of profiles) {
      // Don't import default mikrotik profiles
      if (p.name === 'default' || p.name === 'default-encryption' || p.name === 'EXPIRED') continue;
      
      if (!existingNames.includes(p.name)) {
        const id = `PKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        await query(
          `INSERT INTO internet_packages (id, name, monthly_fee, rate_limit, is_active)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, p.name, 0, p.rateLimit || '', true]
        );
        imported++;
      }
    }
    
    res.status(200).json({ 
      status: 'success', 
      message: `Berhasil sinkronisasi ${imported} profil dari MikroTik.`,
      imported
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  syncFromMikrotik
};
