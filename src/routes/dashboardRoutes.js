const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// GET /api/v1/dashboard
// Restricted to SUPERADMIN and ADMIN_BILLING
router.get('/', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), dashboardController.getDashboardStats);

module.exports = router;
