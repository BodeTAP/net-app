const { query } = require('../config/db');

const scanClient = async (req, res, next) => {
  try {
    const { token } = req.params; // qr_token of Client
    
    const clientResult = await query('SELECT id, fullname, whatsapp, address, mikrotik_profile, is_active FROM clients WHERE qr_token = $1', [token]);
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Client not found' });
    }
    
    const client = clientResult.rows[0];
    
    // Data diagnostik akan diintegrasikan dengan OLT/MikroTik pada fase selanjutnya
    const status = client.is_active ? 'ONLINE' : 'OFFLINE';
    
    res.status(200).json({
      status: 'success',
      data: {
        client,
        diagnostics: {
          status,
          rxPower: 'N/A',
          ping: 'N/A'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { scanClient };
