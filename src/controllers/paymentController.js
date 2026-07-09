const { query } = require('../config/db');
const tripayService = require('../services/tripayService');

const requestPayment = async (req, res, next) => {
  try {
    const { invoice_id, method } = req.body;
    const clientId = req.user.id;

    if (!invoice_id || !method) {
      return res.status(400).json({ status: 'error', message: 'Invoice ID dan Metode pembayaran wajib diisi' });
    }

    // Get invoice details
    const invoiceRes = await query(
      `SELECT i.*, c.fullname, c.whatsapp 
       FROM invoices i 
       JOIN clients c ON i.client_id = c.id 
       WHERE i.id = $1 AND i.client_id = $2`,
      [invoice_id, clientId]
    );

    const invoice = invoiceRes.rows[0];

    if (!invoice) {
      return res.status(404).json({ status: 'error', message: 'Tagihan tidak ditemukan' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ status: 'error', message: 'Tagihan ini sudah lunas' });
    }

    // Tripay Request Payload
    // The amount is invoice.amount + fee (for simplicity, we assume fee is charged to customer or we absorb it).
    // Let's just use invoice.amount. The admin fee is added by Tripay internally if we set flat/percent in their dashboard, or we calculate it here. 
    // We will just use invoice.amount.
    
    // We need a unique merchant_ref for each tripay request, because if a user cancels and tries again, 
    // tripay requires a unique merchant_ref. We append a timestamp to the invoice_id.
    const merchantRef = `${invoice_id}-${Date.now()}`;

    const orderItems = [
      {
        sku: 'NET-INTERNET',
        name: `Tagihan Internet Bulan ${new Date(invoice.due_date).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`,
        price: Number(invoice.amount),
        quantity: 1
      }
    ];

    const returnUrl = `http://localhost:5173/client/invoices`;

    const tripayResponse = await tripayService.requestTransaction({
      merchantRef,
      amount: Number(invoice.amount),
      method,
      customerName: invoice.fullname,
      customerEmail: 'customer@mynetops.com',
      customerPhone: invoice.whatsapp,
      orderItems,
      returnUrl
    });

    if (tripayResponse.success) {
      const checkoutUrl = tripayResponse.data.checkout_url;
      const tripayReference = tripayResponse.data.reference;

      // Update invoice with the tripay reference so we can verify the callback
      await query(
        `UPDATE invoices SET payment_reference = $1, payment_url = $2, payment_method = $3 WHERE id = $4`,
        [merchantRef, checkoutUrl, method, invoice_id]
      );

      return res.status(200).json({
        status: 'success',
        data: {
          checkout_url: checkoutUrl,
          reference: tripayReference
        }
      });
    } else {
      return res.status(500).json({ status: 'error', message: 'Gagal menghubungi Payment Gateway' });
    }
  } catch (error) {
    next(error);
  }
};

const handleCallback = async (req, res, next) => {
  try {
    const signature = req.headers['x-callback-signature'];
    const jsonStr = JSON.stringify(req.body);

    if (!tripayService.verifyCallbackSignature(jsonStr, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const { reference, merchant_ref, status, total_amount } = req.body;

    if (status === 'PAID') {
      // Find the invoice by parsing invoice_id from merchant_ref (INV-YYYYMM-XXXX-TIMESTAMP)
      const invoiceId = merchant_ref.split('-').slice(0, 3).join('-');
      
      const invoiceRes = await query(`SELECT id, amount FROM invoices WHERE id = $1`, [invoiceId]);
      const invoice = invoiceRes.rows[0];

      // Verifikasi bahwa amount yang dibayarkan sesuai dengan tagihan
      if (invoice && Number(total_amount) >= Number(invoice.amount)) {
        await query(
          `UPDATE invoices SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [invoice.id]
        );
        console.log(`[TRIPAY] Invoice ${invoice.id} paid successfully via ${merchant_ref}`);
      } else if (invoice) {
        console.error(`[TRIPAY] Payment amount mismatch for ${invoice.id}. Expected: ${invoice.amount}, Got: ${total_amount}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const getChannels = async (req, res, next) => {
  // In a real app, we fetch from Tripay API `/merchant/payment-channel`.
  // For sandbox testing without exposing secrets immediately, we'll return hardcoded common channels.
  res.status(200).json({
    status: 'success',
    data: [
      { code: 'QRIS', name: 'QRIS (Gopay, OVO, Dana)', group: 'E-Wallet' },
      { code: 'BRIVA', name: 'Virtual Account BRI', group: 'Virtual Account' },
      { code: 'BCAVA', name: 'Virtual Account BCA', group: 'Virtual Account' },
      { code: 'MANDIRIVA', name: 'Virtual Account Mandiri', group: 'Virtual Account' },
      { code: 'ALFAMART', name: 'Alfamart / Alfamidi', group: 'Retail' },
      { code: 'INDOMARET', name: 'Indomaret', group: 'Retail' }
    ]
  });
};

module.exports = { requestPayment, handleCallback, getChannels };
