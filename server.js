const app = require('./src/app');
const { pool } = require('./src/config/db');
const cron = require('node-cron');
const { generateInvoices } = require('./src/controllers/invoiceController');

const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Check DB connection before starting server
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully');
    client.release();

    // Setup Cron Job: Run at midnight on the 1st of every month to generate invoices
    cron.schedule('0 0 1 * *', () => {
      console.log('[CRON] Running monthly invoice generation...');
      // We mock req and res for the controller
      generateInvoices(null, { status: () => ({ json: (data) => console.log(data) }) });
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error.message);
    process.exit(1);
  }
};

startServer();
