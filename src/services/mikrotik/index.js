/**
 * MikroTik Service Router
 * 
 * Modul ini sekarang langsung menghubungkan aplikasi ke RouterOS API.
 * Mode MOCK telah dihapus sesuai permintaan.
 */

require('dotenv').config({ override: true });
const service = require('./live');

console.log('🟢 [MIKROTIK] Terhubung ke RouterOS API (Mode LIVE)');

module.exports = service;
