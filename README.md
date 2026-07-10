# NetOps CRM (Net-App) 🚀

NetOps CRM adalah sebuah sistem ERP (Enterprise Resource Planning) komprehensif yang dirancang khusus untuk Internet Service Provider (ISP), pengelola jaringan RT/RW Net, dan manajemen jaringan kabel fiber optik (FTTH). 

Aplikasi ini menyatukan fitur *billing*, manajemen *router* MikroTik, pemetaan ODP (Optical Distribution Point), hingga modul aplikasi khusus untuk teknisi lapangan dalam satu platform modern.

---

## 🛠️ Tech Stack

### Frontend
* **React.js** (via **Vite**) - Membangun antarmuka pengguna yang sangat responsif.
* **TailwindCSS** - *Framework styling* utilitas yang cepat dan modern.
* **Leaflet & OpenStreetMap** - Pemetaan ODP interaktif bebas biaya (tanpa Google Maps API).
* **Html5-Qrcode** - Sistem pemindai kamera untuk QR Code stiker teknisi.
* **Lucide React** - Set ikon yang ringan dan konsisten.

### Backend
* **Node.js & Express.js** - Menangani API *Routing* dan *Business Logic*.
* **PostgreSQL** - Basis data relasional yang sangat handal dengan dukungan tipe data koordinat spasial (`POINT`).
* **Bcrypt & JWT (JSON Web Token)** - Enkripsi kata sandi dan manajemen otentikasi sesi *(Role-based Access Control)*.

---

## ✨ Fitur Utama

1. **Dashboard Eksekutif**
   Pemantauan total pendapatan, metrik pertumbuhan pelanggan bulanan, rasio tagihan belum dibayar, serta grafik statistik keuangan secara *real-time*.

2. **Manajemen Pelanggan (CRM)**
   Pembuatan data pelanggan baru yang otomatis tersinkronisasi ke *router* MikroTik (melalui PPPoE/Hotspot). Mendukung pencetakan stiker QR unik per pelanggan.

3. **Sistem Tagihan (Billing Automation)**
   Tagihan (Invoice) di-*generate* secara otomatis setiap bulan berdasarkan tanggal siklus (*billing cycle*) masing-masing pelanggan. Dilengkapi fitur *export* ke *file* Microsoft Excel (CSV).

4. **Inventaris & Pemetaan ODP (Fiber Optic)**
   Manajemen kotak pembagi fiber optik (ODP). Teknisi dapat merekam lokasi tiang fisik hanya dengan satu klik pada Peta Interaktif. Dilengkapi visualisasi port (contoh: Port 3 dipakai oleh Budi, Port 4 kosong).

5. **Aplikasi Teknisi Lapangan (Mobile-first)**
   Antarmuka khusus berukuran layar HP untuk teknisi lapangan. Teknisi cukup membuka kamera, memindai stiker QR pada alat pelanggan atau tiang ODP, lalu memanajemen kabel/status perbaikan secara langsung dari lokasi tanpa harus mengetik data apa pun.

6. **Ticketing System**
   Sistem pelaporan gangguan dari pelanggan, pengaturan prioritas penugasan (Rendah/Tinggi), dan *tracking* resolusi masalah oleh teknisi.

7. **Multi-Role Access Control (RBAC)**
   - **Superadmin**: Akses ke seluruh sistem (termasuk Karyawan & Integrasi MikroTik).
   - **Admin Billing**: Fokus pada keuangan, penagihan, pelanggan, dan keluhan (tidak bisa merusak konfigurasi sistem jaringan).
   - **Teknisi**: Hanya memiliki akses ke aplikasi pemindai QR dan penanganan *error* di lapangan.

---

## 💻 Cara Instalasi (Local Development)

Ikuti langkah-langkah di bawah ini untuk menjalankan proyek NetOps CRM di komputer Anda.

### 1. Persiapan Basis Data (PostgreSQL)
1. Pastikan Anda telah menginstal **PostgreSQL**.
2. Buat database baru bernama `netapp_db`.
3. Jalankan migrasi/seed dari backend untuk membuat struktur tabel dan akun awal.

### 2. Persiapan Backend
1. Buka terminal pada folder utama proyek (`Net-App`).
2. Jalankan perintah instalasi dependensi:
   ```bash
   npm install
   ```
3. Salin `.env.example` menjadi `.env`, lalu sesuaikan konfigurasi database, JWT, MikroTik, dan Tripay:
   ```env
   PORT=3000
   DB_USER=postgres
   DB_PASSWORD=password_postgres_anda
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=netapp_db
   
   JWT_SECRET=super_secret_key_netapp
   
   MIKROTIK_HOST=192.168.88.1
   MIKROTIK_USER=admin
   MIKROTIK_PASS=password_routeros_anda
   MIKROTIK_PORT=8728
   MIKROTIK_PROVISIONING_ENABLED=false
   MIKROTIK_ISOLATION_ENABLED=false
   MIKROTIK_PROFILE_WRITE_ENABLED=false

   ENABLE_BILLING_CRON=false
   ENABLE_AUTO_ISOLIR=false
   AUTO_ISOLIR_GRACE_DAYS=3
   ```
4. Jalankan migrasi dan seed:
   ```bash
   npm run migrate
   npm run seed
   ```
5. Jalankan *server* backend:
   ```bash
   npm start
   ```
   *Server akan berjalan di http://localhost:3000*

### 3. Persiapan Frontend
1. Buka jendela terminal baru, arahkan ke dalam folder `frontend`:
   ```bash
   cd frontend
   ```
2. Jalankan perintah instalasi dependensi *frontend*:
   ```bash
   npm install
   ```
3. Jalankan aplikasi web (Vite Development Server):
   ```bash
   npm run dev
   ```
   *Akses aplikasi pada http://localhost:5173*

---

## 🔒 Default Akun Login

Gunakan kredensial berikut untuk masuk pada saat pertama kali (data ini di-*generate* jika Anda menjalankan *seeding* database):

- **Role Superadmin**: 
  - Username: `admin`
  - Password: `password123`
- **Role Admin Billing**: 
  - Username: `billing`
  - Password: `password123`
- **Role Teknisi**: 
  - Username: `teknisi`
  - Password: `password123`

*(Sangat disarankan untuk langsung mengganti password setelah instalasi).*

---
*Dibuat oleh Tim Pongo (Google Antigravity).* 🚀
