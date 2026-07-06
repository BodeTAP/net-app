const express = require('express');
const router = express.Router();
const odpController = require('../controllers/odpController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Mobile Scanner Routes (Requires Technician or Admin)
router.get('/scan/:token', authenticate, odpController.scanODP);
router.post('/assign', authenticate, odpController.assignPort);
router.post('/release', authenticate, odpController.releasePort);

// Admin Dashboard Routes (Requires Admin)
router.get('/', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING', 'TECHNICIAN']), odpController.getOdps);
router.post('/', authenticate, authorize(['SUPERADMIN']), odpController.createOdp);
router.get('/:id', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), odpController.getOdpDetails);
router.delete('/:id', authenticate, authorize(['SUPERADMIN']), odpController.deleteOdp);

module.exports = router;
