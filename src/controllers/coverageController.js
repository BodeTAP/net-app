const { query } = require('../config/db');

const getAllCoverages = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, name, polygon_data, color, created_at
      FROM coverage_areas
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

const createCoverage = async (req, res, next) => {
  try {
    const { name, polygon_data, color } = req.body;
    
    const result = await query(`
      INSERT INTO coverage_areas (name, polygon_data, color)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, JSON.stringify(polygon_data), color || '#3388ff']);
    
    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

const deleteCoverage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM coverage_areas WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Coverage area not found' });
    }
    res.status(200).json({ status: 'success', message: 'Coverage area deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCoverages,
  createCoverage,
  deleteCoverage
};
