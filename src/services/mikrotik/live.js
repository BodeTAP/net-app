const { RouterOSClient } = require('routeros-client');
const { query } = require('../../config/db');
const {
  buildNewSecret,
  buildProfileUpdate,
  buildSyncPreview
} = require('./secretPolicy');

const config = {
  host: process.env.MIKROTIK_HOST || '192.168.88.1',
  user: process.env.MIKROTIK_USER || 'admin',
  password: process.env.MIKROTIK_PASS || '',
  port: parseInt(process.env.MIKROTIK_PORT) || 8728,
  timeout: 10,
};

const wanIface = process.env.MIKROTIK_WAN_IFACE || 'ether1';
const isEnabled = (name) => ['true', '1', 'yes'].includes(
  String(process.env[name] || 'false').toLowerCase()
);

const assertFeatureEnabled = (flag, feature) => {
  if (!isEnabled(flag)) {
    throw new Error(`${feature} dinonaktifkan. Set ${flag}=true untuk mengaktifkannya.`);
  }
};

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
    const freeMem = parseInt(resource.freeMemory);
    const totalMem = parseInt(resource.totalMemory);
    const memoryUsage = Math.round((1 - (freeMem / totalMem)) * 100);

    return {
      cpuLoad: `${resource.cpuLoad}%`,
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

const createPPPoESecret = async (clientId, profile, pppoePassword) => {
  assertFeatureEnabled('MIKROTIK_PROVISIONING_ENABLED', 'Provisioning MikroTik');
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    const exists = await menu.where('name', clientId).get();

    if (exists.length > 0) {
      throw new Error(`PPPoE Secret ${clientId} sudah ada. Pembuatan dibatalkan tanpa mengubah data.`);
    }

    await menu.add(buildNewSecret({
      clientId,
      profile,
      password: pppoePassword
    }));
    
    console.log(`[MIKROTIK LIVE] PPPoE Secret dibuat -> Client: ${clientId}`);
    return { success: true, message: `PPPoE Secret ${clientId} berhasil dibuat.` };
  });
};

const updateSecretProfile = async (clientId, profile) => {
  assertFeatureEnabled('MIKROTIK_PROVISIONING_ENABLED', 'Provisioning MikroTik');
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    const exists = await menu.where('name', clientId).get();

    if (exists.length === 0) {
      throw new Error(`PPPoE Secret ${clientId} tidak ditemukan. Profil tidak diubah.`);
    }

    await menu.where('name', clientId).update(buildProfileUpdate(profile));
    console.log(`[MIKROTIK LIVE] Profil PPPoE diperbarui -> Client: ${clientId}`);
    return { success: true, message: `Profil PPPoE ${clientId} berhasil diperbarui.` };
  });
};

const removeQueue = async (clientId) => {
  assertFeatureEnabled('MIKROTIK_PROVISIONING_ENABLED', 'Provisioning MikroTik');
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    const exists = await menu.where('name', clientId).get();
    if (exists.length > 0) {
      await menu.where('name', clientId).remove();
    }
    
    // Also kill active connection
    const activeMenu = conn.menu('/ppp/active');
    const active = await activeMenu.where('name', clientId).get();
    if (active.length > 0) {
      for (const sess of active) {
        await activeMenu.remove(sess.id);
      }
    }
    
    console.log(`[MIKROTIK LIVE] ❌ PPPoE dihapus → Client: ${clientId}`);
    return { success: true, message: `PPPoE ${clientId} berhasil dihapus.` };
  });
};

const addToIsolir = async (ipAddress, clientId) => {
  assertFeatureEnabled('MIKROTIK_ISOLATION_ENABLED', 'Isolir MikroTik');
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    const exists = await menu.where('name', clientId).get();
    if (exists.length > 0) {
      await menu.where('name', clientId).update({ disabled: 'no', profile: 'EXPIRED' });
    }
    
    // Kill active connection so they reconnect and get the expired profile/IP
    const activeMenu = conn.menu('/ppp/active');
    const active = await activeMenu.where('name', clientId).get();
    if (active.length > 0) {
      for (const sess of active) {
        await activeMenu.remove(sess.id);
      }
    }
    
    console.log(`[MIKROTIK LIVE] 🔒 ISOLIR (Set Profile: EXPIRED) → Client: ${clientId}`);
    return { success: true, message: `Client ${clientId} berhasil diisolir (Profile: EXPIRED).` };
  });
};

const removeFromIsolir = async (ipAddress, clientId) => {
  assertFeatureEnabled('MIKROTIK_ISOLATION_ENABLED', 'Isolir MikroTik');
  return execMikrotik(async (conn) => {
    // Cari original profile dari database
    const dbClient = await query('SELECT mikrotik_profile FROM clients WHERE id = $1', [clientId]);
    const originalProfile = dbClient.rows.length > 0 ? (dbClient.rows[0].mikrotik_profile || 'default') : 'default';

    const menu = conn.menu('/ppp/secret');
    const exists = await menu.where('name', clientId).get();
    if (exists.length > 0) {
      await menu.where('name', clientId).update({ disabled: 'no', profile: originalProfile });
    }
    
    // Kill active connection so they reconnect and get the normal profile/IP
    const activeMenu = conn.menu('/ppp/active');
    const active = await activeMenu.where('name', clientId).get();
    if (active.length > 0) {
      for (const sess of active) {
        await activeMenu.remove(sess.id);
      }
    }

    console.log(`[MIKROTIK LIVE] 🔓 BUKA ISOLIR (Restore Profile: ${originalProfile}) → Client: ${clientId}`);
    return { success: true, message: `Client ${clientId} berhasil dibuka dari isolir.` };
  });
};

const previewPPPoESync = async () => {
  const result = await query(`
    SELECT id, fullname, mikrotik_profile, mikrotik_router_profile, is_active, is_archived
    FROM clients
  `);
  const clients = result.rows;

  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/secret');
    const existingSecrets = await menu.get();
    const preview = buildSyncPreview(clients, existingSecrets);

    console.log(`[MIKROTIK LIVE] Pemeriksaan read-only selesai: CRM ${preview.totalCRM}, RouterOS ${preview.totalRouter}.`);
    return {
      success: true,
      dryRun: true,
      ...preview,
      message: `Pemeriksaan selesai tanpa mengubah MikroTik: ${preview.toImport} akan diimpor, ${preview.toUpdate} diperbarui, ${preview.toArchive} diarsipkan, ${preview.unchanged} sudah sesuai.`
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
    const secrets = await conn.menu('/ppp/secret').get();
    return secrets.map((secret) => ({
      name: secret.name,
      profile: secret.profile || 'default',
      service: secret.service,
      disabled: secret.disabled
    }));
  });
};

const getAllProfiles = async () => {
  return execMikrotik(async (conn) => {
    const profiles = await conn.menu('/ppp/profile').get();
    return profiles.map(p => ({
      id: p.id,
      name: p.name,
      localAddress: p.localAddress || '',
      remoteAddress: p.remoteAddress || '',
      rateLimit: p.rateLimit || '',
      isDefault: p.default === 'true' || p.default === true
    }));
  });
};

const createProfile = async (data) => {
  assertFeatureEnabled('MIKROTIK_PROFILE_WRITE_ENABLED', 'Manajemen profil MikroTik');
  return execMikrotik(async (conn) => {
    await conn.menu('/ppp/profile').add({
      name: data.name,
      'local-address': data.localAddress,
      'remote-address': data.remoteAddress,
      'rate-limit': data.rateLimit
    });
    return { success: true };
  });
};

const updateProfile = async (name, data) => {
  assertFeatureEnabled('MIKROTIK_PROFILE_WRITE_ENABLED', 'Manajemen profil MikroTik');
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/profile');
    const profiles = await menu.where('name', name).get();
    if (profiles.length === 0) return { success: false, message: 'Profile not found' };
    
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.localAddress !== undefined) updateData['local-address'] = data.localAddress;
    if (data.remoteAddress !== undefined) updateData['remote-address'] = data.remoteAddress;
    if (data.rateLimit !== undefined) updateData['rate-limit'] = data.rateLimit;
    
    await menu.where('id', profiles[0].id).update(updateData);
    return { success: true };
  });
};

const deleteProfile = async (name) => {
  assertFeatureEnabled('MIKROTIK_PROFILE_WRITE_ENABLED', 'Manajemen profil MikroTik');
  return execMikrotik(async (conn) => {
    const menu = conn.menu('/ppp/profile');
    const profiles = await menu.where('name', name).get();
    if (profiles.length > 0) {
      await menu.remove(profiles[0].id);
    }
    return { success: true };
  });
};

const getIPPools = async () => {
  return execMikrotik(async (conn) => {
    const pools = await conn.menu('/ip/pool').get();
    return pools.map(p => ({
      name: p.name,
      ranges: p.ranges
    }));
  });
};

module.exports = {
  getSystemResource,
  getTrafficStats,
  createPPPoESecret,
  updateSecretProfile,
  removeQueue,
  addToIsolir,
  removeFromIsolir,
  previewPPPoESync,
  getActiveQueues,
  getPPPoESecrets,
  getAllProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getIPPools,
};
