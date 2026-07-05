const { pool } = require('./src/config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // 1. Run init.sql
    console.log('Running init.sql to create tables...');
    const sqlPath = path.join(__dirname, 'db', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Tables created successfully.');

    // 2. Insert dummy admin user
    console.log('Inserting test SUPERADMIN user...');
    
    // Check if user already exists to prevent duplicate error
    const userCheck = await client.query("SELECT * FROM users WHERE username = 'admin'");
    if (userCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO users (username, password_hash, role, fullname, is_active) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['admin', passwordHash, 'SUPERADMIN', 'Administrator', true]
      );
      console.log('Test user inserted:');
      console.log('Username: admin');
      console.log('Password: admin123');
    } else {
      console.log('Test user "admin" already exists.');
    }

    client.release();
    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during database seeding:', error.message);
    process.exit(1);
  }
};

seedDatabase();
