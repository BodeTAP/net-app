/**
 * MikroTik Live Service
 * 
 * Implementasi nyata yang terhubung langsung ke RouterOS API.
 * 
 * PERSIAPAN:
 * 1. Install library: npm install routeros-client
 * 2. Isi variabel di .env:
 *    MIKROTIK_HOST=192.168.88.1
 *    MIKROTIK_USER=admin
 *    MIKROTIK_PASS=password_anda
 *    MIKROTIK_PORT=8728
 * 3. Ubah MIKROTIK_MODE=live di .env
 * 
 * CATATAN: Setiap fungsi di file ini HARUS memiliki signature yang
 * identik dengan mock.js agar bisa saling menggantikan (pluggable).
 */

const config = {
  host: process.env.MIKROTIK_HOST || '192.168.88.1',
  user: process.env.MIKROTIK_USER || 'admin',
  password: process.env.MIKROTIK_PASS || '',
  port: parseInt(process.env.MIKROTIK_PORT) || 8728,
};

// TODO: Uncomment setelah install routeros-client
// const { RouterOSClient } = require('routeros-client');

const notConfigured = (funcName) => {
  throw new Error(
    `[MIKROTIK LIVE] Fungsi "${funcName}" belum dikonfigurasi. ` +
    `Pastikan library routeros-client sudah terinstall dan kredensial di .env sudah benar.`
  );
};

const getSystemResource = async () => {
  notConfigured('getSystemResource');
  // Contoh implementasi nyata:
  // const client = new RouterOSClient({ ...config });
  // await client.connect();
  // const [resource] = await client.menu('/system/resource').get();
  // await client.disconnect();
  // return {
  //   cpuLoad: `${resource['cpu-load']}%`,
  //   memoryUsage: `${Math.round((1 - resource['free-memory'] / resource['total-memory']) * 100)}%`,
  //   uptime: resource.uptime,
  // };
};

const getTrafficStats = async () => {
  notConfigured('getTrafficStats');
  // Contoh implementasi nyata:
  // const client = new RouterOSClient({ ...config });
  // await client.connect();
  // const interfaces = await client.menu('/interface').get();
  // const ether1 = interfaces.find(i => i.name === 'ether1');
  // await client.disconnect();
  // return {
  //   rxTraffic: `${(ether1['rx-byte'] / 1e6).toFixed(2)} Mbps`,
  //   txTraffic: `${(ether1['tx-byte'] / 1e6).toFixed(2)} Mbps`,
  // };
};

const createQueue = async (clientId, profile, ipAddress) => {
  notConfigured('createQueue');
  // Contoh implementasi nyata:
  // const client = new RouterOSClient({ ...config });
  // await client.connect();
  // await client.menu('/queue/simple').add({
  //   name: `client-${clientId}`,
  //   target: `${ipAddress}/32`,
  //   'max-limit': profile === '10M' ? '10M/10M' : profile === '20M' ? '20M/20M' : '50M/50M',
  // });
  // await client.disconnect();
  // return { success: true, message: `Queue client-${clientId} berhasil dibuat.` };
};

const removeQueue = async (clientId) => {
  notConfigured('removeQueue');
  // Contoh implementasi nyata:
  // const client = new RouterOSClient({ ...config });
  // await client.connect();
  // const queues = await client.menu('/queue/simple').where('name', `client-${clientId}`).get();
  // if (queues.length > 0) {
  //   await client.menu('/queue/simple').where('name', `client-${clientId}`).remove();
  // }
  // await client.disconnect();
  // return { success: true, message: `Queue client-${clientId} berhasil dihapus.` };
};

const addToIsolir = async (ipAddress, clientId) => {
  notConfigured('addToIsolir');
  // Contoh implementasi nyata:
  // const client = new RouterOSClient({ ...config });
  // await client.connect();
  // await client.menu('/ip/firewall/address-list').add({
  //   list: 'isolir',
  //   address: ipAddress,
  //   comment: `Isolir client-${clientId}`,
  // });
  // await client.disconnect();
  // return { success: true, message: `IP ${ipAddress} berhasil diisolir.` };
};

const removeFromIsolir = async (ipAddress, clientId) => {
  notConfigured('removeFromIsolir');
  // Contoh implementasi nyata:
  // const client = new RouterOSClient({ ...config });
  // await client.connect();
  // const entries = await client.menu('/ip/firewall/address-list')
  //   .where('list', 'isolir')
  //   .where('address', ipAddress)
  //   .get();
  // if (entries.length > 0) {
  //   await client.menu('/ip/firewall/address-list')
  //     .where('list', 'isolir')
  //     .where('address', ipAddress)
  //     .remove();
  // }
  // await client.disconnect();
  // return { success: true, message: `IP ${ipAddress} berhasil dibuka dari isolir.` };
};

const syncAllQueues = async () => {
  notConfigured('syncAllQueues');
};

const getActiveQueues = async () => {
  notConfigured('getActiveQueues');
  // Contoh implementasi nyata:
  // const client = new RouterOSClient({ ...config });
  // await client.connect();
  // const queues = await client.menu('/queue/simple').get();
  // await client.disconnect();
  // return queues.map(q => ({
  //   name: q.name,
  //   target: q.target,
  //   profile: q['max-limit'],
  // }));
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
};
