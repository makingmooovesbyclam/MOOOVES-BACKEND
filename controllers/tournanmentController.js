// controllers/tournamentController.js
const Tournament = require('../models/tournament');
const Match = require('../models/match');
const { pairPlayers } = require('../utils/pairing');

exports.startTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id).populate('participants');

    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (tournament.status !== 'pending') return res.status(400).json({ message: 'Tournament already started' });

    const pairs = pairPlayers(tournament.participants);
    const matchIds = [];

    for (const [p1, p2] of pairs) {
      const match = new Match({
        player1: p1,
        player2: p2,
        status: p2 ? 'ongoing' : 'completed', // bye
        winner: p2 ? null : p1, // auto-win if bye
        matchRoomId: null // optional
      });
      await match.save();
      matchIds.push(match._id);
    }

    tournament.rounds.push({ roundNumber: 1, matches: matchIds });
    tournament.status = 'ongoing';
    await tournament.save();

    return res.status(200).json({ message: 'Tournament started', matches: matchIds });
  } catch (error) {
    console.error('Start tournament error:', error);
    res.status(500).json({ message: 'Internal error: ' + error.message });
  }
};