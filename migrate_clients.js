require('dotenv').config();
const { query } = require('./src/config/db');
const bcrypt = require('bcrypt');

async function migrate() {
  try {
    console.log("Checking if password_hash column exists...");
    const checkRes = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='clients' and column_name='password_hash';
    `);

    if (checkRes.rows.length === 0) {
      console.log("Adding password_hash column...");
      await query(`ALTER TABLE clients ADD COLUMN password_hash VARCHAR(255);`);
      console.log("Column added.");
    } else {
      console.log("Column already exists.");
    }

    console.log("Setting default passwords for clients (password = whatsapp number)...");
    const clientsRes = await query(`SELECT id, whatsapp FROM clients WHERE password_hash IS NULL`);
    
    for (let client of clientsRes.rows) {
      // Clean whatsapp to only numbers
      const password = client.whatsapp.replace(/\D/g, '');
      const hash = await bcrypt.hash(password, 10);
      await query(`UPDATE clients SET password_hash = $1 WHERE id = $2`, [hash, client.id]);
      console.log(`Updated client ${client.id}`);
    }
    
    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
