const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.get('/client/:token/status', authenticate, authorize(['SUPERADMIN', 'TECHNICIAN']), technicianController.scanClient);

module.exports = router;
