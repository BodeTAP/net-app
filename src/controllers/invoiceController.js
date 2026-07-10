const { query } = require('../config/db');
const mikrotik = require('../services/mikrotik');
const { generateMonthlyInvoices } = require('../services/billingService');

const getInvoices = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Auto-detect OVERDUE: update any UNPAID invoices past due date
    await query(`
      UPDATE invoices SET status = 'OVERDUE' 
      WHERE status = 'UNPAID' AND due_date < CURRENT_DATE
    `);

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'ALL') {
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (c.fullname ILIKE $${paramIndex} OR i.id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM invoices i JOIN clients c ON i.client_id = c.id ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated data
    const result = await query(
      `SELECT i.*, c.fullname, c.whatsapp 
       FROM invoices i 
       JOIN clients c ON i.client_id = c.id 
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.status(200).json({
      status: 'success',
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        limit: parseInt(limit),
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    // Auto-detect OVERDUE first
    await query(`
      UPDATE invoices SET status = 'OVERDUE' 
      WHERE status = 'UNPAID' AND due_date < CURRENT_DATE
    `);

    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'UNPAID') AS unpaid_count,
        COUNT(*) FILTER (WHERE status = 'OVERDUE') AS overdue_count,
        COUNT(*) FILTER (WHERE status = 'PAID') AS paid_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'UNPAID'), 0) AS unpaid_total,
        COALESCE(SUM(amount) FILTER (WHERE status = 'OVERDUE'), 0) AS overdue_total,
        COALESCE(SUM(amount) FILTER (WHERE status = 'PAID' AND paid_at >= date_trunc('month', CURRENT_DATE)), 0) AS paid_this_month
      FROM invoices
    `);

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const generateInvoices = async (req, res, next) => {
  try {
    const result = await generateMonthlyInvoices();
    
    res.status(200).json({
      status: 'success',
      message: `Berhasil membuat ${result.generatedCount} tagihan baru tanpa menjalankan isolir.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const simulatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `UPDATE invoices SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Tagihan tidak ditemukan' });
    }
    
    const invoice = result.rows[0];
    const clientResult = await query('SELECT * FROM clients WHERE id = $1', [invoice.client_id]);
    const client = clientResult.rows[0];
    
    if (client) {
      await mikrotik.removeFromIsolir(client.ip_address || '0.0.0.0', client.id);
    }
    
    res.status(200).json({ status: 'success', message: 'Pembayaran berhasil disimulasikan.' });
  } catch (error) {
    next(error);
  }
};

const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Tagihan tidak ditemukan' });
    }
    
    res.status(200).json({ status: 'success', message: `Tagihan ${id} berhasil dibatalkan.` });
  } catch (error) {
    next(error);
  }
};

const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Tidak ada ID tagihan yang diberikan' });
    }
    
    // We can use ANY($1) syntax for array in Postgres
    await query(`DELETE FROM invoices WHERE id = ANY($1)`, [ids]);
    
    res.status(200).json({ status: 'success', message: `${ids.length} tagihan berhasil dibatalkan` });
  } catch (error) {
    next(error);
  }
};

const bulkPay = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Tidak ada ID tagihan yang diberikan' });
    }

    const result = await query(
      `UPDATE invoices SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = ANY($1) RETURNING *`,
      [ids]
    );

    // Un-isolir each client
    for (const inv of result.rows) {
      try {
        const clientRes = await query('SELECT ip_address FROM clients WHERE id = $1', [inv.client_id]);
        if (clientRes.rows.length > 0) {
          const clientIp = clientRes.rows[0].ip_address || '0.0.0.0';
          await mikrotik.removeFromIsolir(clientIp, inv.client_id);
        }
      } catch (err) {
        console.error(`Gagal un-isolir klien ${inv.client_id}:`, err.message);
      }
    }

    res.status(200).json({ status: 'success', message: `${result.rows.length} tagihan berhasil dilunasi` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getSummary,
  generateInvoices,
  simulatePayment,
  deleteInvoice,
  bulkDelete,
  bulkPay
};
