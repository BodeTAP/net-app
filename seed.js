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

    // 2. Insert default users
    console.log('Inserting default users...');
    const defaultUsers = [
      ['admin', 'SUPERADMIN', 'Administrator'],
      ['billing', 'ADMIN_BILLING', 'Admin Billing'],
      ['teknisi', 'TECHNICIAN', 'Teknisi Lapangan'],
    ];

    for (const [username, role, fullname] of defaultUsers) {
      const userCheck = await client.query('SELECT id FROM users WHERE username = $1', [username]);

      if (userCheck.rows.length === 0) {
        const passwordHash = await bcrypt.hash('password123', 10);
        await client.query(
          `INSERT INTO users (username, password_hash, role, fullname, is_active)
           VALUES ($1, $2, $3, $4, $5)`,
          [username, passwordHash, role, fullname, true]
        );
        console.log(`Default user inserted: ${username} / password123`);
      } else {
        console.log(`Default user "${username}" already exists.`);
      }
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
