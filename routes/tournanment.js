// routes/tournamentRoutes.js
const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');

router.post('/:id/start', tournamentController.startTournament);

module.exports = router;