const { query } = require('./src/config/db');

async function migrate() {
  try {
    console.log('Starting GIS migration...');
    
    // Create ODCs table
    await query(`
      CREATE TABLE IF NOT EXISTS odcs (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        total_ports INT DEFAULT 16,
        coordinates POINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table odcs created.');

    // Add odc_id to odps if not exists
    try {
      await query(`
        ALTER TABLE odps ADD COLUMN odc_id VARCHAR(50) REFERENCES odcs(id) ON DELETE SET NULL
      `);
      console.log('Column odc_id added to odps.');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('Column odc_id already exists in odps.');
      } else {
        console.error('Error adding odc_id:', e.message);
      }
    }

    // Create Coverage Areas table
    await query(`
      CREATE TABLE IF NOT EXISTS coverage_areas (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        polygon_data JSONB NOT NULL,
        color VARCHAR(20) DEFAULT '#3388ff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table coverage_areas created.');

    console.log('GIS migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
