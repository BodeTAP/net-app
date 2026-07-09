const { query } = require('../config/db');
const mikrotik = require('../services/mikrotik');

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
    const clients = await query('SELECT * FROM clients WHERE is_active = TRUE');
    const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    
    let generatedCount = 0;
    
    for (const client of clients.rows) {
      try {
        const existingInvoice = await query(
          `SELECT id FROM invoices WHERE client_id = $1 AND id LIKE $2`,
          [client.id, `INV-${currentMonth}-%`]
        );
        
        if (existingInvoice.rows.length === 0) {
          const invId = `INV-${currentMonth}-${Math.floor(1000 + Math.random() * 9000)}`;
          const date = new Date();
          const dueDate = new Date(date.getFullYear(), date.getMonth(), client.billing_cycle_date || 5);
          
          await query(
            `INSERT INTO invoices (id, client_id, amount, due_date, status) 
             VALUES ($1, $2, $3, $4, 'UNPAID')`,
             [invId, client.id, client.monthly_fee, dueDate]
          );
          
          generatedCount++;
          
          console.log(`[WA GATEWAY] Pesan terkirim ke ${client.whatsapp}: Halo ${client.fullname}, tagihan ${invId} sebesar Rp${client.monthly_fee} jatuh tempo ${dueDate.toLocaleDateString('id-ID')}.`);

          if (new Date() > dueDate) {
            // Check if client has auto_isolir enabled
            if (client.auto_isolir) {
              await mikrotik.addToIsolir(client.ip_address || '0.0.0.0', client.id);
            } else {
              console.log(`[ISOLIR SKIPPED] Klien ${client.id} memiliki auto_isolir = false`);
            }
          }
        }
      } catch (err) {
        console.error(`[CRON ERROR] Gagal memproses tagihan untuk klien ${client.id}:`, err.message);
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: `Berhasil mencetak ${generatedCount} tagihan baru.`
    });
  } catch (error) {
    if (next) next(error);
    else console.error('Cron Error:', error);
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

module.exports = { getInvoices, getSummary, generateInvoices, simulatePayment, deleteInvoice };
