const express = require('express');
const router = express.Router();
const clientAppController = require('../controllers/clientAppController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.post('/login', clientAppController.login);

// Protected client routes
router.get('/dashboard', authenticate, authorize(['CLIENT']), clientAppController.getMyDashboard);
router.get('/invoices', authenticate, authorize(['CLIENT']), clientAppController.getMyInvoices);
router.get('/tickets', authenticate, authorize(['CLIENT']), clientAppController.getMyTickets);
router.post('/tickets', authenticate, authorize(['CLIENT']), clientAppController.createTicket);

module.exports = router;
