const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/', authenticate, ticketController.getTickets);
router.get('/summary', authenticate, ticketController.getSummary);
router.get('/technicians', authenticate, authorize(['SUPERADMIN']), ticketController.getTechnicians);
router.get('/clients', authenticate, ticketController.getClients);

// Ticket CRUD
router.post('/', authenticate, authorize(['SUPERADMIN']), ticketController.createTicket);
router.patch('/:id/status', authenticate, authorize(['SUPERADMIN', 'TECHNICIAN']), ticketController.updateTicketStatus);

// Resolve Ticket with Photo Upload
router.put('/:id/resolve', authenticate, authorize(['SUPERADMIN', 'TECHNICIAN']), upload.single('photo'), ticketController.resolveTicket);

router.delete('/:id', authenticate, authorize(['SUPERADMIN']), ticketController.deleteTicket);

module.exports = router;
