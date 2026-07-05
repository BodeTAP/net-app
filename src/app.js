const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// Import and use routes here
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const clientRoutes = require('./routes/clientRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const networkRoutes = require('./routes/networkRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const userRoutes = require('./routes/userRoutes');
const odpRoutes = require('./routes/odpRoutes');
const odcRoutes = require('./routes/odcRoutes');
const coverageRoutes = require('./routes/coverageRoutes');
const clientAppRoutes = require('./routes/clientAppRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/scan', technicianRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/network', networkRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/odps', odpRoutes); // Handles both mobile scan and admin dashboard
app.use('/api/v1/odcs', odcRoutes);
app.use('/api/v1/coverages', coverageRoutes);
app.use('/api/v1/client-app', clientAppRoutes);
app.use('/api/v1/payment', paymentRoutes);

// Centralized error handling middleware
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

module.exports = app;
