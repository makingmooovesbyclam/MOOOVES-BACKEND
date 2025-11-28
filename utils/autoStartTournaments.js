

// utils/autoStartTournaments.js
const Tournament = require("../models/tournament");
const tournamentController = require("../controllers/tournanmentController");
const LOG = console;

async function autoStartTournaments() {
  try {
    const now = new Date();

    // Allow auto-start only for tournaments whose start time is EXACTLY NOW
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneMinuteAhead = new Date(now.getTime() + 60 * 1000);

    const tournaments = await Tournament.find({
      status: "scheduled",
      autoStartEnabled: true,
      startTime: { $gte: oneMinuteAgo, $lte: oneMinuteAhead } // <-- FIX
    });

    for (const t of tournaments) {
      try {
        await tournamentController.startTournamentLogic(t);
        LOG.log(`✅ Auto-started tournament ${t._id} (${t.name})`);
      } catch (err) {
        LOG.error(`Auto-start failed for ${t._id}:`, err.message);
         t.autoStartEnabled = false;
        await t.save()
      }
    }
  } catch (err) {
    LOG.error("autoStartTournaments error", err);
  }
}

module.exports = autoStartTournaments;