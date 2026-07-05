const express = require('express');
const router = express.Router();
const coverageController = require('../controllers/coverageController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', coverageController.getAllCoverages);
router.post('/', authorize(['SUPERADMIN', 'ADMIN_BILLING']), coverageController.createCoverage);
router.delete('/:id', authorize(['SUPERADMIN']), coverageController.deleteCoverage);

module.exports = router;
