const { query } = require('../config/db');
const mikrotik = require('../services/mikrotik');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

    // 2. Ambil data hardware dari MikroTik Service (mock atau live)
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

const syncMikrotik = async (req, res, next) => {
  try {
    const result = await mikrotik.syncAllQueues();

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const importMikrotik = async (req, res, next) => {
  try {
    const secrets = await mikrotik.getPPPoESecrets();
    
    // Get existing clients
    const existingRes = await query('SELECT id FROM clients');
    const existingIds = existingRes.rows.map(r => r.id);
    
    let importedCount = 0;
    
    for (const secret of secrets) {
      if (!existingIds.includes(secret.name)) {
        // Prepare new client data
        const id = secret.name;
        const fullname = secret.name; // Use name as fullname initially
        const mikrotikProfile = secret.profile || 'default';
        const rawPassword = secret.password || '123456';
        
        // WhatsApp is set to password if it's numeric, otherwise empty string
        const isNumeric = /^\d+$/.test(rawPassword);
        const whatsapp = isNumeric ? rawPassword : '';
        
        const qrToken = crypto.randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        const isActive = secret.disabled !== 'true' && secret.disabled !== true;
        
        await query(
          `INSERT INTO clients (
            id, qr_token, fullname, whatsapp, address, 
            mikrotik_profile, monthly_fee, billing_cycle_date, 
            is_active, password_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            id, qrToken, fullname, whatsapp, '', 
            mikrotikProfile, 0, 1, 
            isActive, passwordHash
          ]
        );
        importedCount++;
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: `Berhasil menarik ${importedCount} pelanggan baru dari MikroTik.`,
      imported: importedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTelemetry, syncMikrotik, importMikrotik };
