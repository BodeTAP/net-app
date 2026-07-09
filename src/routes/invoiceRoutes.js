const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.get('/', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), invoiceController.getInvoices);
router.get('/summary', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), invoiceController.getSummary);
router.post('/generate', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), invoiceController.generateInvoices);
router.post('/:id/simulate-payment', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), invoiceController.simulatePayment);
router.delete('/:id', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), invoiceController.deleteInvoice);
router.post('/bulk-delete', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), invoiceController.bulkDelete);
router.post('/bulk-pay', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), invoiceController.bulkPay);

module.exports = router;
