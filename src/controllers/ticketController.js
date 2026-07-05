const { query } = require('../config/db');

const getTickets = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10, technician_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'ALL') {
      whereClause += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (c.fullname ILIKE $${paramIndex} OR t.title ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (technician_id) {
      whereClause += ` AND t.assigned_technician_id = $${paramIndex}`;
      params.push(technician_id);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM tickets t LEFT JOIN clients c ON t.client_id = c.id ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const result = await query(
      `SELECT t.*, c.fullname AS client_name, c.whatsapp AS client_whatsapp, c.address AS client_address, c.coordinates AS client_coordinates,
              u.fullname AS technician_name
       FROM tickets t
       LEFT JOIN clients c ON t.client_id = c.id
       LEFT JOIN users u ON t.assigned_technician_id = u.id
       ${whereClause}
       ORDER BY 
         CASE t.status 
           WHEN 'OPEN' THEN 1 
           WHEN 'IN_PROGRESS' THEN 2 
           WHEN 'RESOLVED' THEN 3 
         END,
         t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.status(200).json({
      status: 'success',
      data: result.rows,
      pagination: { currentPage: parseInt(page), totalPages, totalItems, limit: parseInt(limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'OPEN') AS open_count,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved_count,
        COUNT(*) AS total_count
      FROM tickets
    `);
    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const { client_id, title, description, assigned_technician_id } = req.body;

    const result = await query(
      `INSERT INTO tickets (client_id, title, description, assigned_technician_id, status)
       VALUES ($1, $2, $3, $4, 'OPEN') RETURNING *`,
      [client_id || null, title, description || null, assigned_technician_id || null]
    );

    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assigned_technician_id } = req.body;

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Status tidak valid' });
    }

    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (assigned_technician_id !== undefined) {
      updateFields.push(`assigned_technician_id = $${paramIndex}`);
      params.push(assigned_technician_id || null);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Tidak ada data yang diubah' });
    }

    params.push(id);
    const result = await query(
      `UPDATE tickets SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Tiket tidak ditemukan' });
    }

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM tickets WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Tiket tidak ditemukan' });
    }

    res.status(200).json({ status: 'success', message: `Tiket #${id} berhasil dihapus.` });
  } catch (error) {
    next(error);
  }
};

// Helper: get technicians for assignment dropdown
const getTechnicians = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, fullname FROM users WHERE role IN ('SUPERADMIN', 'TECHNICIAN') AND is_active = TRUE ORDER BY fullname`
    );
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Helper: get clients for dropdown
const getClients = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, fullname FROM clients WHERE is_active = TRUE ORDER BY fullname`
    );
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTickets, getSummary, createTicket, updateTicketStatus, deleteTicket, getTechnicians, getClients };
