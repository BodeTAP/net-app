/**
 * MikroTik Service Router
 * 
 * File ini secara otomatis memilih implementasi yang tepat
 * berdasarkan variabel MIKROTIK_MODE di file .env:
 * 
 *   MIKROTIK_MODE=mock  → Simulasi (default, untuk development)
 *   MIKROTIK_MODE=live  → Koneksi nyata ke RouterOS API
 * 
 * Semua modul lain (Controller, Cron Job, dll) cukup memanggil:
 *   const mikrotik = require('../services/mikrotik');
 * 
 * Dan tidak perlu peduli apakah sedang dalam mode mock atau live.
 */

require('dotenv').config();
const mode = process.env.MIKROTIK_MODE || 'mock';

let service;

if (mode === 'live') {
  service = require('./live');
  console.log('🟢 [MIKROTIK] Mode: LIVE — Terhubung ke RouterOS API');
} else {
  service = require('./mock');
  console.log('🟡 [MIKROTIK] Mode: MOCK — Menggunakan simulasi lokal');
}

module.exports = service;
