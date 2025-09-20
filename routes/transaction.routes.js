// routes/bankRoutes.js
const express = require('express');
const router = express.Router();
const transaction = require('../controllers/transaction');

// Get list of banks
router.get('/banks', transaction.getBanks);

// Add or update bank details
router.post('/bank-details', transaction.addBankDetails);

module.exports = router;