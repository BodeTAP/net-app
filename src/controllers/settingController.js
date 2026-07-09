const { query } = require('../config/db');

const getSettings = async (req, res, next) => {
  try {
    const result = await query('SELECT key, value FROM company_settings');
    
    // Convert array of rows into a single key-value object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.status(200).json({ status: 'success', data: settings });
  } catch (error) {
    next(error);
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ status: 'error', message: 'Value is required' });
    }

    const result = await query(
      `INSERT INTO company_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING *`,
      [key, JSON.stringify(value)]
    );

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSetting };
