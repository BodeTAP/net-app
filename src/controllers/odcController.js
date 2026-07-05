const { query } = require('../config/db');

const getAllODCs = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, name, total_ports, coordinates, created_at
      FROM odcs
      ORDER BY created_at DESC
    `);
    res.status(200).json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

const createODC = async (req, res, next) => {
  try {
    const { id, name, total_ports, coordinates } = req.body;
    
    // Auto-generate ID if not provided
    const odcId = id || `ODC-${Date.now()}`;
    
    const result = await query(`
      INSERT INTO odcs (id, name, total_ports, coordinates)
      VALUES ($1, $2, $3, point($4, $5))
      RETURNING *
    `, [odcId, name, total_ports || 16, coordinates.lng, coordinates.lat]); // Postgres POINT is (lng, lat)
    
    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ status: 'error', message: 'ODC ID already exists' });
    }
    next(error);
  }
};

const deleteODC = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM odcs WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'ODC not found' });
    }
    res.status(200).json({ status: 'success', message: 'ODC deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllODCs,
  createODC,
  deleteODC
};
