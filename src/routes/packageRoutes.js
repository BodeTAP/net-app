const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', packageController.getPackages);

router.use(authorize(['SUPERADMIN']));

router.post('/sync', packageController.syncFromMikrotik);
router.post('/', packageController.createPackage);
router.put('/:id', packageController.updatePackage);
router.delete('/:id', packageController.deletePackage);

module.exports = router;
