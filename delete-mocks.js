const { query } = require('./src/config/db');
query("DELETE FROM clients WHERE id IN ('budi_home', 'alice_kos')")
  .then(() => console.log('Deleted mock clients'))
  .catch(console.error)
  .finally(() => process.exit(0));
