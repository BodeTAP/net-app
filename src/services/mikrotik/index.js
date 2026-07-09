require('dotenv').config({ override: true });

const service = require('./live');

console.log('[MIKROTIK] Service mode: LIVE');

module.exports = service;
