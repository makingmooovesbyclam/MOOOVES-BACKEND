const express = require('express');
const router = express.Router();
const { makeMove ,createMatch} = require('../controllers/gameController');

const matchController = require('../controllers/gameController');

router.post('/:matchId/submit-result', matchController.submitResult);

router.post('/move', makeMove);
router.post('/moves', createMatch);

module.exports = router;