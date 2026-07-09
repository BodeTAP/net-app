const { query } = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mikrotik = require('../services/mikrotik');
const getClients = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let whereClauseJoin = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'ALL') {
      whereClause += ` AND is_active = $${paramIndex}`;
      whereClauseJoin += ` AND c.is_active = $${paramIndex}`;
      params.push(status === 'ACTIVE');
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (fullname ILIKE $${paramIndex} OR whatsapp ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`;
      whereClauseJoin += ` AND (c.fullname ILIKE $${paramIndex} OR c.whatsapp ILIKE $${paramIndex} OR c.id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(`SELECT COUNT(*) FROM clients ${whereClause}`, params);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const result = await query(`
      SELECT c.id, c.qr_token, c.fullname, c.whatsapp, c.address, c.coordinates, c.mikrotik_profile, c.monthly_fee, c.billing_cycle_date, c.is_active, c.auto_isolir, c.created_at, p.odp_id
      FROM clients c
      LEFT JOIN port_assignments p ON c.id = p.client_id
      ${whereClauseJoin}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), parseInt(offset)]);
    
    res.status(200).json({
      status: 'success',
      data: result.rows,
      pagination: { currentPage: parseInt(page), totalPages, totalItems, limit: parseInt(limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getClientDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Get client basic data
    const clientResult = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Pelanggan tidak ditemukan' });
    }
    const client = clientResult.rows[0];

    // 2. Get client's invoices
    const invoicesResult = await query('SELECT id, amount, due_date, status, paid_at FROM invoices WHERE client_id = $1 ORDER BY due_date DESC LIMIT 10', [id]);
    
    // 3. Get client's tickets
    const ticketsResult = await query('SELECT id, title, status, created_at FROM tickets WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10', [id]);

    res.status(200).json({
      status: 'success',
      data: {
        ...client,
        recent_invoices: invoicesResult.rows,
        recent_tickets: ticketsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    const { fullname, whatsapp, address, mikrotik_profile, monthly_fee, billing_cycle_date, auto_isolir } = req.body;
    
    const id = `CL-${Date.now()}`;
    const qr_token = crypto.randomUUID();

    const insertQuery = `
      INSERT INTO clients (id, qr_token, fullname, whatsapp, address, mikrotik_profile, monthly_fee, billing_cycle_date, auto_isolir, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    // Default password is whatsapp number (digits only)
    const password = whatsapp.replace(/\D/g, '');
    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(insertQuery, [
      id, qr_token, fullname, whatsapp, address, mikrotik_profile, monthly_fee, billing_cycle_date || 1, auto_isolir !== undefined ? auto_isolir : true, password_hash
    ]);

    // Trigger MikroTik Sync (Create PPPoE Secret)
    try {
      await mikrotik.createQueue(id, mikrotik_profile, '', whatsapp);
    } catch (err) {
      console.error(`[MIKROTIK SYNC ERROR] ${err.message}`);
    }

    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullname, whatsapp, address, mikrotik_profile, monthly_fee, billing_cycle_date, is_active, auto_isolir } = req.body;

    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (fullname) { updateFields.push(`fullname = $${paramIndex}`); params.push(fullname); paramIndex++; }
    if (whatsapp) { updateFields.push(`whatsapp = $${paramIndex}`); params.push(whatsapp); paramIndex++; }
    if (address) { updateFields.push(`address = $${paramIndex}`); params.push(address); paramIndex++; }
    if (mikrotik_profile) { updateFields.push(`mikrotik_profile = $${paramIndex}`); params.push(mikrotik_profile); paramIndex++; }
    if (monthly_fee) { updateFields.push(`monthly_fee = $${paramIndex}`); params.push(monthly_fee); paramIndex++; }
    if (billing_cycle_date) { updateFields.push(`billing_cycle_date = $${paramIndex}`); params.push(billing_cycle_date); paramIndex++; }
    if (is_active !== undefined) { updateFields.push(`is_active = $${paramIndex}`); params.push(is_active); paramIndex++; }
    if (auto_isolir !== undefined) { updateFields.push(`auto_isolir = $${paramIndex}`); params.push(auto_isolir); paramIndex++; }

    if (updateFields.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Tidak ada data yang diubah' });
    }

    params.push(id);
    const result = await query(
      `UPDATE clients SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Pelanggan tidak ditemukan' });
    }

    // Trigger MikroTik Sync if is_active changed
    if (is_active !== undefined) {
      try {
        if (is_active === false) {
          await mikrotik.addToIsolir('', id); // Use isolir so they get redirected to blocked page
        } else {
          await mikrotik.removeFromIsolir('', id); // Revert to original profile
        }
      } catch (err) {
        console.error(`[MIKROTIK SYNC ERROR] ${err.message}`);
      }
    } else if (mikrotik_profile || whatsapp) {
      // Trigger sync if profile or whatsapp changed
      try {
        const clientData = result.rows[0];
        await mikrotik.createQueue(id, clientData.mikrotik_profile, '', clientData.whatsapp);
      } catch (err) {
        console.error(`[MIKROTIK SYNC ERROR] ${err.message}`);
      }
    }

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    // We do soft delete by setting is_active = false
    const result = await query('UPDATE clients SET is_active = FALSE WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Pelanggan tidak ditemukan' });
    }
    
    // Trigger MikroTik Isolir (Soft Delete in Mikrotik)
    try {
      await mikrotik.addToIsolir('', id);
    } catch (err) {
      console.error(`[MIKROTIK SYNC ERROR] ${err.message}`);
    }

    res.status(200).json({ status: 'success', message: 'Pelanggan berhasil dinonaktifkan' });
  } catch (error) {
    next(error);
  }
};

const updateClientLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ status: 'error', message: 'Latitude and longitude are required' });
    }

    const result = await query(
      'UPDATE clients SET coordinates = point($1, $2) WHERE id = $3 RETURNING *',
      [lng, lat, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Client not found' });
    }

    res.status(200).json({ status: 'success', message: 'Location updated', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClients,
  getClientDetails,
  createClient,
  updateClient,
  deleteClient,
  updateClientLocation
};
