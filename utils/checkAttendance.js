// utils/checkAttendance.js
const Match = require('../models/match');
const Tournament = require('../models/tournament');
const sendEmail = require('../helper/nodemailer'); // your email helper
const LOG = console;

async function checkMatchAttendance() {
  try {
    const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
    const matches = await Match.find({
      status: 'waiting',
      waitingStartedAt: { $lte: threshold }
    }).populate('players').populate('tournamentId');

    for (const m of matches) {
      const joined = (m.joinedPlayers || []).map(id => id.toString());
      if (joined.length === 1) {
        // one player wins by default
        m.status = 'completed';
        m.winner = [joined[0]];
        await m.save();

        // notify the winner
        try {
          const winnerUser = m.joinedPlayers[0];
          await sendEmail({
            email: (winnerUser.email || ''), // ensure your joinedPlayers store user docs or fetch user
            subject: 'You advanced — opponent did not show',
            html:` <p>You advanced in the tournament because your opponent didn't show up. Good luck in the next round!</p>`
          });
        } catch (e) {
          LOG.warn('Failed to send advance email', e.message);
        }

        LOG.log(`Player ${joined[0]} advanced by no-show in match ${m._id}`);
      } else if (joined.length === 0) {
        // both absent => forfeited
        m.status = 'forfeited';
        await m.save();

        // notify participants if you can fetch emails
        LOG.log(`Both players forfeited match ${m._id}`);
      }

      // After updating match results, you might want to trigger bracket progression.
      // That logic depends on how you advance winners to next round — call a bracket updater here.
    }
  } catch (err) {
    LOG.error('checkMatchAttendance error', err);
  }
}

module.exports = checkMatchAttendance;