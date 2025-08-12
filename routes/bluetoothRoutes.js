const express = require('express');
const router = express.Router();
const { createHandshake } = require('../controllers/bluetoothController');

router.post('/handshake', createHandshake);

module.exports = router;