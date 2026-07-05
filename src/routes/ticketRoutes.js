const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.get('/', authenticate, ticketController.getTickets);
router.get('/summary', authenticate, ticketController.getSummary);
router.get('/technicians', authenticate, ticketController.getTechnicians);
router.get('/clients', authenticate, ticketController.getClients);
router.post('/', authenticate, authorize(['SUPERADMIN', 'ADMIN_BILLING']), ticketController.createTicket);
router.patch('/:id', authenticate, ticketController.updateTicketStatus);
router.delete('/:id', authenticate, authorize(['SUPERADMIN']), ticketController.deleteTicket);

module.exports = router;
