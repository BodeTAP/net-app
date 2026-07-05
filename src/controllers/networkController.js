const { query } = require('../config/db');
const mikrotik = require('../services/mikrotik');

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

module.exports = { getTelemetry, syncMikrotik };
