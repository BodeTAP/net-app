const express = require('express');
const router = express.Router();
const networkController = require('../controllers/networkController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.get('/telemetry', authenticate, authorize(['SUPERADMIN']), networkController.getTelemetry);
router.post('/sync', authenticate, authorize(['SUPERADMIN']), networkController.syncMikrotik);

module.exports = router;
