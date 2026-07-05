const express = require('express');
const router = express.Router();
const odcController = require('../controllers/odcController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', odcController.getAllODCs);
router.post('/', authorize(['SUPERADMIN', 'TECHNICIAN']), odcController.createODC);
router.delete('/:id', authorize(['SUPERADMIN']), odcController.deleteODC);

module.exports = router;
