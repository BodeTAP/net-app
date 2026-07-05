const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Client routes for initiating payment
router.post('/request', authenticate, authorize(['CLIENT']), paymentController.requestPayment);
router.get('/channels', authenticate, authorize(['CLIENT']), paymentController.getChannels);

// Public webhook route for Tripay callback
router.post('/callback', paymentController.handleCallback);

module.exports = router;
