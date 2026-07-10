const crypto = require('crypto');
const { query } = require('../config/db');

const getBillingPeriod = (date = new Date()) => (
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
);

const getDueDate = (billingCycleDate, date = new Date()) => {
  const day = Math.min(Math.max(Number(billingCycleDate) || 5, 1), 28);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${String(day).padStart(2, '0')}`;
};

const generateMonthlyInvoices = async (date = new Date()) => {
  const clients = await query(`
    SELECT id, fullname, whatsapp, monthly_fee, billing_cycle_date
    FROM clients
    WHERE is_active = TRUE AND is_archived = FALSE
  `);
  const billingPeriod = getBillingPeriod(date);
  let generatedCount = 0;
  let skippedCount = 0;
  const failures = [];

  for (const client of clients.rows) {
    try {
      const existingInvoice = await query(
        'SELECT id FROM invoices WHERE client_id = $1 AND id LIKE $2',
        [client.id, `INV-${billingPeriod}-%`]
      );

      if (existingInvoice.rows.length > 0) {
        skippedCount++;
        continue;
      }

      const invoiceId = `INV-${billingPeriod}-${crypto.randomUUID()}`;
      const dueDate = getDueDate(client.billing_cycle_date, date);

      await query(
        `INSERT INTO invoices (id, client_id, amount, due_date, status)
         VALUES ($1, $2, $3, $4, 'UNPAID')`,
        [invoiceId, client.id, client.monthly_fee, dueDate]
      );

      generatedCount++;
      console.log(`[WA GATEWAY] Pesan terkirim ke ${client.whatsapp}: Halo ${client.fullname}, tagihan ${invoiceId} sebesar Rp${client.monthly_fee} jatuh tempo ${dueDate}.`);
    } catch (error) {
      failures.push({ clientId: client.id, message: error.message });
      console.error(`[BILLING ERROR] Gagal membuat tagihan klien ${client.id}:`, error.message);
    }
  }

  return {
    generatedCount,
    skippedCount,
    failedCount: failures.length,
    failures
  };
};

module.exports = {
  generateMonthlyInvoices,
  getBillingPeriod,
  getDueDate
};
