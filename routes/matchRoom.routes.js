const express = require('express');
const router = express.Router();
const controller = require('../controllers/matchRoom.controller');

router.post('/match', controller.createMatchRoom);
router.post('/match/:roomId', controller.joinMatchRoom);

module.exports = router;