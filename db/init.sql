-- NetOps CRM database schema
-- This file is safe to run repeatedly for local setup/migration.

-- 0. Users/Admins (RBAC)
CREATE TABLE IF NOT EXISTS users (
 id SERIAL PRIMARY KEY,
 username VARCHAR(50) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 role VARCHAR(20) NOT NULL,
 fullname VARCHAR(100) NOT NULL,
 is_active BOOLEAN DEFAULT TRUE
);

-- 1. Internet packages / MikroTik profiles
CREATE TABLE IF NOT EXISTS internet_packages (
 id VARCHAR(50) PRIMARY KEY,
 name VARCHAR(100) UNIQUE NOT NULL,
 monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
 rate_limit VARCHAR(100),
 is_active BOOLEAN DEFAULT TRUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Clients (Pelanggan)
CREATE TABLE IF NOT EXISTS clients (
 id VARCHAR(50) PRIMARY KEY,
 qr_token VARCHAR(255) UNIQUE NOT NULL,
 fullname VARCHAR(100) NOT NULL,
 whatsapp VARCHAR(20) NOT NULL,
 password_hash VARCHAR(255),
 address TEXT NOT NULL,
 coordinates POINT,
 ip_address VARCHAR(45),
 mikrotik_profile VARCHAR(50) NOT NULL,
 monthly_fee NUMERIC(10,2) NOT NULL,
 billing_cycle_date INT DEFAULT 1,
 auto_isolir BOOLEAN DEFAULT TRUE,
 is_active BOOLEAN DEFAULT TRUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ODC (Optical Distribution Cabinet)
CREATE TABLE IF NOT EXISTS odcs (
 id VARCHAR(50) PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 total_ports INT DEFAULT 16,
 coordinates POINT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ODP (Optical Distribution Point)
CREATE TABLE IF NOT EXISTS odps (
 id VARCHAR(50) PRIMARY KEY,
 qr_token VARCHAR(255) UNIQUE NOT NULL,
 name VARCHAR(100) NOT NULL,
 total_ports INT DEFAULT 8,
 coordinates POINT NOT NULL,
 odc_id VARCHAR(50) REFERENCES odcs(id) ON DELETE SET NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Coverage polygons for map layers
CREATE TABLE IF NOT EXISTS coverage_areas (
 id SERIAL PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 polygon_data JSONB NOT NULL,
 color VARCHAR(20) DEFAULT '#3388ff',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Port assignments
CREATE TABLE IF NOT EXISTS port_assignments (
 id SERIAL PRIMARY KEY,
 odp_id VARCHAR(50) REFERENCES odps(id) ON DELETE CASCADE,
 port_number INT NOT NULL,
 client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
 status VARCHAR(20) DEFAULT 'FREE',
 UNIQUE(odp_id, port_number)
);

-- 7. Device/ONT inventory
CREATE TABLE IF NOT EXISTS ont_devices (
 mac_address VARCHAR(17) PRIMARY KEY,
 serial_number VARCHAR(50) UNIQUE NOT NULL,
 client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
 last_optical_power NUMERIC(4,2),
 updated_at TIMESTAMP
);

-- 8. Invoices (Tagihan)
CREATE TABLE IF NOT EXISTS invoices (
 id VARCHAR(50) PRIMARY KEY,
 client_id VARCHAR(50) REFERENCES clients(id),
 amount NUMERIC(10,2) NOT NULL,
 due_date DATE NOT NULL,
 status VARCHAR(20) DEFAULT 'UNPAID',
 payment_method VARCHAR(50),
 payment_reference VARCHAR(100),
 payment_url TEXT,
 paid_at TIMESTAMP,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tickets (Gangguan)
CREATE TABLE IF NOT EXISTS tickets (
 id SERIAL PRIMARY KEY,
 client_id VARCHAR(50) REFERENCES clients(id),
 title VARCHAR(150) NOT NULL,
 description TEXT,
 status VARCHAR(20) DEFAULT 'OPEN',
 assigned_technician_id INT REFERENCES users(id),
 closing_photo_url VARCHAR(255),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Company/application settings
CREATE TABLE IF NOT EXISTS company_settings (
 key VARCHAR(100) PRIMARY KEY,
 value JSONB NOT NULL,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backfill columns for older databases created from previous init.sql versions.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS auto_isolir BOOLEAN DEFAULT TRUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_technician_id INT REFERENCES users(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closing_photo_url VARCHAR(255);
ALTER TABLE odps ADD COLUMN IF NOT EXISTS odc_id VARCHAR(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'odps_odc_id_fkey'
  ) THEN
    ALTER TABLE odps
      ADD CONSTRAINT odps_odc_id_fkey
      FOREIGN KEY (odc_id) REFERENCES odcs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Practical defaults for a new local install.
INSERT INTO internet_packages (id, name, monthly_fee, rate_limit, is_active)
VALUES ('PKT-DEFAULT', 'default', 0, '', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_settings (key, value)
VALUES
  ('bank_accounts', '[]'::jsonb),
  ('admin_whatsapp', '"6281234567890"'::jsonb),
  ('telemetry_interval', '"5000"'::jsonb)
ON CONFLICT (key) DO NOTHING;

UPDATE clients SET auto_isolir = TRUE WHERE auto_isolir IS NULL;
