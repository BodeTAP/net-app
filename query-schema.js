const { query } = require('./src/config/db');
query("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'clients'")
  .then(res => console.table(res.rows))
  .catch(console.error)
  .finally(() => process.exit(0));
