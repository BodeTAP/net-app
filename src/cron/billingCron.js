const cron = require('node-cron');
const { query } = require('../config/db');
const mikrotik = require('../services/mikrotik');
const { generateMonthlyInvoices } = require('../services/billingService');

const runGenerateInvoices = async () => {
  try {
    const result = await generateMonthlyInvoices();
    console.log(`[CRON] Berhasil membuat ${result.generatedCount} tagihan baru tanpa menjalankan isolir.`);
  } catch (error) {
    console.error('[CRON ERROR] Gagal menjalankan mesin tagihan:', error);
  }
};

const runAutoIsolir = async () => {
  try {
    const graceDays = Math.max(parseInt(process.env.AUTO_ISOLIR_GRACE_DAYS, 10) || 3, 0);

    // 1. Update status to OVERDUE for UNPAID past due date
    await query(`
      UPDATE invoices SET status = 'OVERDUE' 
      WHERE status = 'UNPAID' AND due_date < CURRENT_DATE
    `);

    // 2. Fetch all clients who have an OVERDUE invoice, are active, and have auto_isolir = TRUE
    const overdueClients = await query(`
      SELECT DISTINCT c.id, c.ip_address, c.fullname
      FROM clients c
      JOIN invoices i ON c.id = i.client_id
      WHERE i.status = 'OVERDUE'
        AND i.due_date <= CURRENT_DATE - ($1::integer * INTERVAL '1 day')
        AND c.is_active = TRUE
        AND c.is_archived = FALSE
        AND c.auto_isolir = TRUE
    `, [graceDays]);

    // 3. Isolate them
    let isolirCount = 0;
    for (const client of overdueClients.rows) {
      try {
        await mikrotik.addToIsolir(client.ip_address || '0.0.0.0', client.id);
        
        // Soft delete/mark inactive in DB so they appear as inactive in the UI
        await query(`UPDATE clients SET is_active = FALSE WHERE id = $1`, [client.id]);
        
        isolirCount++;
        console.log(`[CRON ISOLIR] Klien ${client.fullname} (${client.id}) diisolir otomatis.`);
      } catch (err) {
        console.error(`[CRON ERROR] Gagal mengisolir klien ${client.id}:`, err.message);
      }
    }
    
    if (isolirCount > 0) {
      console.log(`[CRON] Berhasil mengisolir ${isolirCount} pelanggan.`);
    }
  } catch (error) {
    console.error('[CRON ERROR] Gagal menjalankan auto isolir:', error);
  }
};

const initCron = () => {
  const autoIsolirEnabled = ['true', '1', 'yes'].includes(
    String(process.env.ENABLE_AUTO_ISOLIR || 'false').toLowerCase()
  );

  // Run every day at 00:01
  cron.schedule('1 0 * * *', async () => {
    console.log('[CRON] Menjalankan pembuatan tagihan harian...');
    await runGenerateInvoices();
    if (autoIsolirEnabled) {
      await runAutoIsolir();
    }
  });
  console.log(`[CRON] Billing aktif pukul 00:01. Auto-isolir: ${autoIsolirEnabled ? 'aktif' : 'nonaktif'}.`);
};

module.exports = { initCron, runGenerateInvoices, runAutoIsolir };
