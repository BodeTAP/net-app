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

    // Setup Cron Job
    initCron();

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error.message);
    process.exit(1);
  }
};

startServer();
