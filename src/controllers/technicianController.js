const { query } = require('../config/db');

const scanClient = async (req, res, next) => {
  try {
    const { token } = req.params; // qr_token of Client
    
    const clientResult = await query('SELECT id, fullname, whatsapp, address, mikrotik_profile, is_active FROM clients WHERE qr_token = $1', [token]);
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Client not found' });
    }
    
    const client = clientResult.rows[0];
    
    // Simulate ping / Rx Power check (In real life, this talks to OLT/MikroTik via Module 4)
    const rxPower = (Math.random() * (15 - 25) + (-25)).toFixed(2); // Random Rx Power between -15 and -25 dBm
    const status = client.is_active ? 'ONLINE' : 'OFFLINE';
    
    res.status(200).json({
      status: 'success',
      data: {
        client,
        diagnostics: {
          status,
          rxPower: `${rxPower} dBm`,
          ping: status === 'ONLINE' ? '12ms' : 'Timeout'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { scanClient };
