const express = require('express');
const router = express.Router();
const networkController = require('../controllers/networkController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.get('/telemetry', authenticate, authorize(['SUPERADMIN']), networkController.getTelemetry);
router.post('/sync', authenticate, authorize(['SUPERADMIN']), networkController.previewMikrotikSync);
router.post('/reconcile', authenticate, authorize(['SUPERADMIN']), networkController.reconcileFromMikrotik);
router.post('/import', authenticate, authorize(['SUPERADMIN']), networkController.reconcileFromMikrotik);

// PPPoE Profiles
router.get('/profiles', authenticate, authorize(['SUPERADMIN']), networkController.getProfiles);
router.post('/profiles', authenticate, authorize(['SUPERADMIN']), networkController.createProfile);
router.patch('/profiles/:id', authenticate, authorize(['SUPERADMIN']), networkController.updateProfile);
router.delete('/profiles/:id', authenticate, authorize(['SUPERADMIN']), networkController.deleteProfile);

// IP Pools
router.get('/ip-pools', authenticate, authorize(['SUPERADMIN']), networkController.getIPPools);

module.exports = router;
