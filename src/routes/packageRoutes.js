const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', packageController.getPackages);

router.use(restrictTo('ADMIN'));

router.post('/sync', packageController.syncFromMikrotik);
router.post('/', packageController.createPackage);
router.put('/:id', packageController.updatePackage);
router.delete('/:id', packageController.deletePackage);

module.exports = router;
