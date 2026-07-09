const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const login = async (req, res, next) => {
  try {
    const { whatsapp, password } = req.body;

    if (!whatsapp || !password) {
      return res.status(400).json({ status: 'error', message: 'WhatsApp dan password diperlukan' });
    }

    const result = await query('SELECT id, whatsapp, password_hash, fullname, is_active FROM clients WHERE whatsapp = $1', [whatsapp]);
    const client = result.rows[0];

    if (!client || !client.is_active) {
      return res.status(401).json({ status: 'error', message: 'Kredensial tidak valid atau akun tidak aktif' });
    }

    const isMatch = await bcrypt.compare(password, client.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Kredensial tidak valid' });
    }

    const payload = {
      id: client.id,
      whatsapp: client.whatsapp,
      role: 'CLIENT',
      fullname: client.fullname
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: payload
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMyDashboard = async (req, res, next) => {
  try {
    const clientId = req.user.id;
    const result = await query(
      `SELECT id, fullname, whatsapp, address, mikrotik_profile, monthly_fee, billing_cycle_date, is_active 
       FROM clients WHERE id = $1`, 
      [clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Pelanggan tidak ditemukan' });
    }

    // Get current unpaid invoice if any
    const invoiceRes = await query(
      `SELECT id, amount, due_date, status FROM invoices WHERE client_id = $1 AND status != 'PAID' ORDER BY due_date ASC LIMIT 1`,
      [clientId]
    );

    res.status(200).json({ 
      status: 'success', 
      data: {
        profile: result.rows[0],
        currentInvoice: invoiceRes.rows[0] || null
      } 
    });
  } catch (error) {
    next(error);
  }
};

const getMyInvoices = async (req, res, next) => {
  try {
    const clientId = req.user.id;
    const result = await query(
      `SELECT * FROM invoices WHERE client_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [clientId]
    );
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getMyTickets = async (req, res, next) => {
  try {
    const clientId = req.user.id;
    const result = await query(
      `SELECT * FROM tickets WHERE client_id = $1 ORDER BY created_at DESC`,
      [clientId]
    );
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    next(error);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const clientId = req.user.id;
    const { title, description } = req.body;

    if (!title) {
       return res.status(400).json({ status: 'error', message: 'Judul tiket diperlukan' });
    }

    const result = await query(
      `INSERT INTO tickets (client_id, title, description, status)
       VALUES ($1, $2, $3, 'OPEN') RETURNING *`,
      [clientId, title, description || null]
    );

    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const result = await query('SELECT key, value FROM company_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.status(200).json({ status: 'success', data: settings });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMyDashboard, getMyInvoices, getMyTickets, createTicket, getSettings };
