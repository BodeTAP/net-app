const app = require('./src/app');
const { pool } = require('./src/config/db');
const { initCron } = require('./src/cron/billingCron');

const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Check DB connection before starting server
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully');
    client.release();

    const billingCronEnabled = ['true', '1', 'yes'].includes(
      String(process.env.ENABLE_BILLING_CRON || 'false').toLowerCase()
    );

    if (billingCronEnabled) {
      initCron();
    } else {
      console.log('[CRON] Billing & isolir otomatis dinonaktifkan.');
    }

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error.message);
    process.exit(1);
  }
};

startServer();
