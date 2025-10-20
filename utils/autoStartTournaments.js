// utils/autoStartTournaments.js
const Tournament = require('../models/tournament');
const tournamentController = require('../controllers/tournanmentController'); // will expose startTournamentLogic
const LOG = console;

async function autoStartTournaments() {
  try {
    const now = new Date();
    const tournaments = await Tournament.find({
      status: 'scheduled',
      startTime: { $lte: now },
      autoStartEnabled: true
    });

    for (const t of tournaments) {
      try {
        // Ensure participants length check is inside start logic (it will throw if insufficient)
        await tournamentController.startTournamentLogic(t);
        LOG.log(`✅ Auto-started tournament ${t._id} (${t.name})`);
      } catch (err) {
        LOG.error(`Auto-start failed for ${t._id}:`, err.message);
        // Do not crash; host can reschedule or start manually
      }
    }
  } catch (err) {
    LOG.error('autoStartTournaments error', err);
  }
}

module.exports = autoStartTournaments;