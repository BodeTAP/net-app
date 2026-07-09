const cron = require('node-cron');
const { query } = require('../config/db');
const mikrotik = require('../services/mikrotik');

// Helper to wrap generateInvoices since it expects req, res
const runGenerateInvoices = async () => {
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

          if (new Date() > dueDate && client.auto_isolir) {
            await mikrotik.addToIsolir(client.ip_address || '0.0.0.0', client.id);
          }
        }
      } catch (err) {
        console.error(`[CRON ERROR] Gagal memproses tagihan untuk klien ${client.id}:`, err.message);
      }
    }
    console.log(`[CRON] Berhasil mencetak ${generatedCount} tagihan baru.`);
  } catch (error) {
    console.error('[CRON ERROR] Gagal menjalankan mesin tagihan:', error);
  }
};

const runAutoIsolir = async () => {
  try {
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
      WHERE i.status = 'OVERDUE' AND c.is_active = TRUE AND c.auto_isolir = TRUE
    `);

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
  // Run every day at 00:01
  cron.schedule('1 0 * * *', async () => {
    console.log('[CRON] Menjalankan tugas harian: Pembuatan Tagihan & Auto-Isolir...');
    await runGenerateInvoices();
    await runAutoIsolir();
  });
  console.log('[CRON] Billing & Isolir otomatis telah diaktifkan (Berjalan setiap jam 00:01).');
};

module.exports = { initCron, runGenerateInvoices, runAutoIsolir };
