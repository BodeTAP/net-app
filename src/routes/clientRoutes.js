const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.get('/', authenticate, clientController.getClients);
router.get('/:id', authenticate, clientController.getClientDetails);
router.post('/', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), clientController.createClient);
router.patch('/:id', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), clientController.updateClient);
router.delete('/:id', authenticate, authorize(['SUPERADMIN']), clientController.deleteClient);

module.exports = router;
