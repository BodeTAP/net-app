const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/db');

const migrate = async () => {
  const client = await pool.connect();

  try {
    const sqlPath = path.join(__dirname, 'db', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('Database schema is up to date.');
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
