const { query } = require('../../config/db');

/**
 * MikroTik Mock Service
 * 
 * Implementasi simulasi untuk pengembangan dan pengujian lokal.
 * Setiap fungsi mencetak log realistis ke terminal tanpa memerlukan
 * koneksi ke perangkat keras MikroTik sungguhan.
 */

const getSystemResource = async () => {
  const cpuLoad = Math.floor(Math.random() * 30) + 10;
  const memoryUsage = Math.floor(Math.random() * 40) + 40;
  const uptime = '14d 5h 22m';

  console.log(`[MIKROTIK MOCK] Membaca resource sistem... CPU: ${cpuLoad}%, RAM: ${memoryUsage}%`);

  return {
    cpuLoad: `${cpuLoad}%`,
    memoryUsage: `${memoryUsage}%`,
    uptime,
  };
};

const getTrafficStats = async () => {
  const rxTraffic = (Math.random() * 500 + 100).toFixed(2);
  const txTraffic = (Math.random() * 50 + 10).toFixed(2);

  console.log(`[MIKROTIK MOCK] Membaca trafik... Rx: ${rxTraffic} Mbps, Tx: ${txTraffic} Mbps`);

  return {
    rxTraffic: `${rxTraffic} Mbps`,
    txTraffic: `${txTraffic} Mbps`,
  };
};

const createQueue = async (clientId, profile, ipAddress) => {
  console.log(`[MIKROTIK MOCK] ✅ Simple Queue dibuat → Client: ${clientId}, Profil: ${profile}, IP: ${ipAddress}`);
  return { success: true, message: `Queue ${clientId} (${profile}) berhasil dibuat.` };
};

const removeQueue = async (clientId) => {
  console.log(`[MIKROTIK MOCK] ❌ Simple Queue dihapus → Client: ${clientId}`);
  return { success: true, message: `Queue ${clientId} berhasil dihapus.` };
};

const addToIsolir = async (ipAddress, clientId) => {
  console.log(`[MIKROTIK MOCK] 🔒 ISOLIR → IP ${ipAddress} (Client: ${clientId}) ditambahkan ke Address List "isolir"`);
  return { success: true, message: `IP ${ipAddress} berhasil diisolir.` };
};

const removeFromIsolir = async (ipAddress, clientId) => {
  console.log(`[MIKROTIK MOCK] 🔓 BUKA ISOLIR → IP ${ipAddress} (Client: ${clientId}) dihapus dari Address List "isolir"`);
  return { success: true, message: `IP ${ipAddress} berhasil dibuka dari isolir.` };
};

const syncAllQueues = async () => {
  const result = await query('SELECT id, fullname, mikrotik_profile FROM clients WHERE is_active = TRUE');
  const clients = result.rows;

  console.log(`[MIKROTIK MOCK] 🔄 Sinkronisasi dimulai... ${clients.length} pelanggan aktif ditemukan.`);

  for (const client of clients) {
    console.log(`  → Queue: ${client.fullname} | Profil: ${client.mikrotik_profile}`);
  }

  console.log(`[MIKROTIK MOCK] ✅ Sinkronisasi selesai. ${clients.length} queue berhasil disinkronkan.`);

  return {
    success: true,
    total: clients.length,
    message: `Berhasil menyinkronkan ${clients.length} queue ke MikroTik.`,
  };
};

const getActiveQueues = async () => {
  const result = await query(`
    SELECT id, fullname, mikrotik_profile 
    FROM clients 
    WHERE is_active = TRUE 
    ORDER BY fullname
  `);

  return result.rows.map(c => ({
    name: c.fullname,
    target: `192.168.1.x`, // Mock IP
    profile: c.mikrotik_profile,
  }));
};

const getPPPoESecrets = async () => {
  return [
    { name: 'budi_home', password: '123', profile: '20M', disabled: 'false' },
    { name: 'alice_kos', password: 'abc', profile: '10M', disabled: 'false' }
  ];
};

module.exports = {
  getSystemResource,
  getTrafficStats,
  createQueue,
  removeQueue,
  addToIsolir,
  removeFromIsolir,
  syncAllQueues,
  getActiveQueues,
  getPPPoESecrets,
};
