-- 0. Table Users/Admins (RBAC)
CREATE TABLE users (
 id SERIAL PRIMARY KEY,
 username VARCHAR(50) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 role VARCHAR(20) NOT NULL, -- SUPERADMIN, ADMIN_BILLING, TECHNICIAN
 fullname VARCHAR(100) NOT NULL,
 is_active BOOLEAN DEFAULT TRUE
);

-- 1. Table Clients (Pelanggan)
CREATE TABLE clients (
 id VARCHAR(50) PRIMARY KEY,
 qr_token VARCHAR(255) UNIQUE NOT NULL,
 fullname VARCHAR(100) NOT NULL,
 whatsapp VARCHAR(20) NOT NULL,
 password_hash VARCHAR(255),
 address TEXT NOT NULL,
 coordinates POINT,
 mikrotik_profile VARCHAR(50) NOT NULL,
 monthly_fee NUMERIC(10,2) NOT NULL,
 billing_cycle_date INT DEFAULT 1,
 is_active BOOLEAN DEFAULT TRUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table ODP (Optical Distribution Pack)
CREATE TABLE odps (
 id VARCHAR(50) PRIMARY KEY,
 qr_token VARCHAR(255) UNIQUE NOT NULL,
 name VARCHAR(100) NOT NULL,
 total_ports INT DEFAULT 8,
 coordinates POINT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table Port Assignments
CREATE TABLE port_assignments (
 id SERIAL PRIMARY KEY,
 odp_id VARCHAR(50) REFERENCES odps(id) ON DELETE CASCADE,
 port_number INT NOT NULL,
 client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
 status VARCHAR(20) DEFAULT 'FREE',
 UNIQUE(odp_id, port_number)
);

-- 4. Table Device/ONT Inventory
CREATE TABLE ont_devices (
 mac_address VARCHAR(17) PRIMARY KEY,
 serial_number VARCHAR(50) UNIQUE NOT NULL,
 client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
 last_optical_power NUMERIC(4,2),
 updated_at TIMESTAMP
);

-- 5. Table Invoices (Tagihan)
CREATE TABLE invoices (
 id VARCHAR(50) PRIMARY KEY, -- INV-YYYYMM-XXXX
 client_id VARCHAR(50) REFERENCES clients(id),
 amount NUMERIC(10,2) NOT NULL,
 due_date DATE NOT NULL,
 status VARCHAR(20) DEFAULT 'UNPAID', -- UNPAID, PAID, OVERDUE
 payment_method VARCHAR(50),
 payment_reference VARCHAR(100),
 payment_url TEXT,
 paid_at TIMESTAMP,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table Tickets (Gangguan)
CREATE TABLE tickets (
 id SERIAL PRIMARY KEY,
 client_id VARCHAR(50) REFERENCES clients(id),
 title VARCHAR(150) NOT NULL,
 description TEXT,
 status VARCHAR(20) DEFAULT 'OPEN',
 assigned_technician_id INT REFERENCES users(id),
 closing_photo_url VARCHAR(255),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
