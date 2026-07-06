const { RouterOSClient } = require('routeros-client');
const { query } = require('../../config/db');

const config = {
  host: process.env.MIKROTIK_HOST || '192.168.88.1',
  user: process.env.MIKROTIK_USER || 'admin',
  password: process.env.MIKROTIK_PASS || '',
  port: parseInt(process.env.MIKROTIK_PORT) || 8728,
};

const wanIface = process.env.MIKROTIK_WAN_IFACE || 'ether1';

const execMikrotik = async (callback) => {
  const client = new RouterOSClient(config);
  try {
    const conn = await client.connect();
    const result = await callback(conn);
    client.close();
    return result;
  } catch (error) {
    client.close();
    console.error('[MIKROTIK LIVE ERROR]', error.message);
    throw error;
  }
};

const getSystemResource = async () => {
  return execMikrotik(async (conn) => {
    const [resource] = await conn.menu('/system/resource').get();
    
    // Parse memory
    const freeMem = parseInt(resource['free-memory']);
    const totalMem = parseInt(resource['total-memory']);
    const memoryUsage = Math.round((1 - (freeMem / totalMem)) * 100);

    return {
      cpuLoad: `${resource['cpu-load']}%`,
      memoryUsage: `${memoryUsage}%`,
      uptime: resource.uptime,
    };
  });
};

const getTrafficStats = async () => {
  return execMikrotik(async (conn) => {
    const interfaces = await conn.menu('/interface').where('name', wanIface).get();
    if (interfaces.length === 0) {
      return { rxTraffic: '0 Mbps', txTraffic: '0 Mbps' };
    }
    
    const iface = interfaces[0];
    const rxByte = parseInt(iface['rx-byte']) || 0;
    const txByte = parseInt(iface['tx-byte']) || 0;
    
    // We convert bytes to approx Mbps (this is total bytes, but usually we want current rate, 
    // to get current rate in RouterOS we'd use `/interface/monitor-traffic`, but `routeros-client` 
    // handles continuous streams differently. For simplicity and matching the mock, we'll return 
    // a formatted value, or we could use `/interface/monitor-traffic` with `once`).
    
    const monitor = await conn.menu('/interface').exec('monitor-traffic', { interface: wanIface, once: 'yes' });
    
    if (monitor && monitor.length > 0) {
      const rxBps = parseInt(monitor[0].rxBitsPerSecond) || 0;
      const txBps = parseInt(monitor[0].txBitsPerSecond) || 0;
      
      return {
        rxTraffic: `${(rxBps / 1e6).toFixed(2)} Mbps`,
        txTraffic: `${(txBps / 1e6).toFixed(2)} Mbps`,
      };
    }

    return {
      rxTraffic: `0 Mbps`,
      txTraffic: `0 Mbps`,
    };
  });
};

const createQueue = async (clientId, profile, ipAddress, whatsapp) => {
  // We use this function to create PPPoE Secret
  const password = whatsapp || '123456';
  
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    
    // Check if exists
    const exists = await menu.where('name', clientId).get();
    if (exists.length > 0) {
      await menu.where('name', clientId).update({
        password: password,
        profile: profile || 'default',
        disabled: 'no'
      });
    } else {
      await menu.add({
        name: clientId,
        password: password,
        profile: profile || 'default',
        service: 'pppoe'
      });
    }
    
    console.log(`[MIKROTIK LIVE] ✅ PPPoE Secret dibuat/diupdate → Client: ${clientId}`);
    return { success: true, message: `PPPoE Secret ${clientId} berhasil dibuat.` };
  });
};

const removeQueue = async (clientId) => {
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    const exists = await menu.where('name', clientId).get();
    if (exists.length > 0) {
      await menu.where({ '.id': exists[0]['.id'] }).remove();
    }
    
    // Also kill active connection
    const activeMenu = conn.menu('/ppp/active');
    const active = await activeMenu.where('name', clientId).get();
    if (active.length > 0) {
      for (const sess of active) {
        await activeMenu.where('.id', sess['.id']).remove();
      }
    }
    
    console.log(`[MIKROTIK LIVE] ❌ PPPoE dihapus → Client: ${clientId}`);
    return { success: true, message: `PPPoE ${clientId} berhasil dihapus.` };
  });
};

const addToIsolir = async (ipAddress, clientId) => {
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    const exists = await menu.where('name', clientId).get();
    if (exists.length > 0) {
      await menu.where({ '.id': exists[0]['.id'] }).set({ disabled: 'yes' });
    }
    
    // Kill active connection so they disconnect immediately
    const activeMenu = conn.menu('/ppp/active');
    const active = await activeMenu.where('name', clientId).get();
    if (active.length > 0) {
      for (const sess of active) {
        await activeMenu.where('.id', sess['.id']).remove();
      }
    }
    
    console.log(`[MIKROTIK LIVE] 🔒 ISOLIR (Disable PPPoE) → Client: ${clientId}`);
    return { success: true, message: `Client ${clientId} berhasil diisolir (PPPoE Disabled).` };
  });
};

const removeFromIsolir = async (ipAddress, clientId) => {
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    const exists = await menu.where('name', clientId).get();
    if (exists.length > 0) {
      await menu.where({ '.id': exists[0]['.id'] }).set({ disabled: 'no' });
    }
    
    console.log(`[MIKROTIK LIVE] 🔓 BUKA ISOLIR (Enable PPPoE) → Client: ${clientId}`);
    return { success: true, message: `Client ${clientId} berhasil dibuka dari isolir.` };
  });
};

const syncAllQueues = async () => {
  // Sync all PPPoE Secrets
  const result = await query('SELECT id, fullname, whatsapp, mikrotik_profile FROM clients WHERE is_active = TRUE');
  const clients = result.rows;

  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    const existingSecrets = await menu.get();
    
    let synced = 0;
    
    for (const client of clients) {
      const password = client.whatsapp || '123456';
      const existing = existingSecrets.find(sec => sec.name === client.id);
      
      try {
        if (existing) {
          // Update jika sudah ada
          await menu.where({ '.id': existing['.id'] }).set({
            password: password,
            profile: client.mikrotik_profile || 'default',
            service: 'pppoe'
          });
        } else {
          // Tambah baru jika belum ada
          await menu.add({
            name: client.id,
            password: password,
            profile: client.mikrotik_profile || 'default',
            service: 'pppoe'
          });
        }
        synced++;
      } catch (err) {
        console.error(`[MIKROTIK LIVE] Gagal sinkron klien ${client.id}:`, err.message);
      }
    }
    
    console.log(`[MIKROTIK LIVE] ✅ Sinkronisasi selesai. ${synced} PPPoE Secret di-update/dibuat dari total ${clients.length} klien aktif.`);
    return {
      success: true,
      total: clients.length,
      message: `Berhasil menyinkronkan ${synced} akun PPPoE ke MikroTik secara aman tanpa menghapus data eksisting.`,
    };
  });
};

const getActiveQueues = async () => {
  return execMikrotik(async (conn) => {
    const active = await conn.menu('/ppp/active').get();
    
    return active.map(sess => ({
      name: sess.name,         // Actually client.id, but this is what we show in UI for now
      target: sess.address || 'N/A',
      profile: sess.service || 'pppoe',
      uptime: sess.uptime || ''
    }));
  });
};

const getPPPoESecrets = async () => {
  return execMikrotik(async (conn) => {
    return await conn.menu('/ppp/secret').get();
  });
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
