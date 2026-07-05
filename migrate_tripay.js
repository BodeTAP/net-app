require('dotenv').config();
const { query } = require('./src/config/db');

async function migrate() {
  try {
    console.log("Checking if payment_reference column exists...");
    const checkRes = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='invoices' and column_name='payment_reference';
    `);

    if (checkRes.rows.length === 0) {
      console.log("Adding payment_reference and payment_url columns...");
      await query(`ALTER TABLE invoices ADD COLUMN payment_reference VARCHAR(100);`);
      await query(`ALTER TABLE invoices ADD COLUMN payment_url TEXT;`);
      console.log("Columns added.");
    } else {
      console.log("Columns already exist.");
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
