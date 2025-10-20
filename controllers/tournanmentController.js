// controllers/tournamentController.js
const Tournament = require('../models/tournament');
const Match = require('../models/match');
const User = require('../models/user')
const Host = require('../models/host');


const Transaction = require('../models/transaction');

const crypto = require('crypto');




const sendEmail = require('../helper/nodemailer');



// Reschedule endpoint (creator)
exports.rescheduleTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const { newStartTime } = req.body;
    const userId = req.user.id;

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (String(tournament.createdBy) !== String(userId)) return res.status(403).json({ message: 'Only creator can reschedule' });
    if (tournament.status !== 'scheduled') return res.status(400).json({ message: 'Only scheduled tournaments can be rescheduled' });

    const newDate = new Date(newStartTime);
    if (isNaN(newDate.getTime()) || newDate < new Date()) return res.status(400).json({ message: 'Invalid new start time' })
      tournament.startTime = newDate;
    await tournament.save();

    // notify participants about reschedule (optional)
    // for each participant, fetch email and send a brief email/whatsapp

    return res.status(200).json({ message: 'Tournament rescheduled', startTime: tournament.startTime });
  } catch (err) {
    console.error('[rescheduleTournament error]', err);
    return res.status(500).json({ message: err.message });
  }
};
exports.createTournament = async (req, res) => {
  try {
    const { organizerId, name, maxPlayers, entryFee, startTime } = req.body;

    if (!organizerId || !name) return res.status(400).json({ error: "Host and name are required" });
    if (maxPlayers && maxPlayers > 50) return res.status(400).json({ error: "maximum player is 50" });
    if (!startTime) return res.status(400).json({ error: "startTime is required (UTC ISO string)" });

    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime()) || startDate < new Date()) {
      return res.status(400).json({ error: "Invalid or past start time" });
    }

    let user = await User.findById(organizerId);
    let host = null;
    if (!user) {
      host = await Host.findById(organizerId);
      if (!host) return res.status(404).json({ error: "Organizer not found" });
    }

    // If user must earn host rights:
    if (user && !user.canHostTournament) {
      if (user.tournamentsJoinedCount < 2) {
        return res.status(403).json({ error: "You must join at least 2 tournaments before hosting one" });
      }
      user.canHostTournament = true;
      await user.save();
    }

    const inviteCode = crypto.randomBytes(4).toString('hex');
    const creatorModel = user ? 'User' : 'Host';

    const tournament = new Tournament({
      name,
      createdBy: organizerId,
      createdByModel: creatorModel,
      participants: [],
      maxParticipants: maxPlayers || 16,
      entryFee: entryFee || 0,
      prizePool: 0,
      inviteCode,
      status: 'scheduled',
      startTime: startDate,
      autoStartEnabled: true
    });

    await tournament.save();

    // Optional email to creator
    const firstName = (user?.fullName || host?.fullName || '').split(' ')[0] || 'Organizer';
    await sendEmail({
      email: (user?.email || host?.email),
      subject: 'Tournament Scheduled',
      html: `<p>Hi ${firstName}, your tournament <b>${tournament.name}</b> is scheduled for <b>${startDate.toUTCString()}</b>.</p>`
    });

    const inviteLink = `${process.env.BASE_URL}/api/v1/tournaments/join/${tournament.inviteCode}`;
    return res.status(201).json({ message: "Tournament created successfully", tournament, inviteLink });
  } catch (err) {
    console.error('[createTournament error]', err);
    return res.status(500).json({ error: err.message });
  }
};

// utils/pairing.js
const pairPlayers = (players) => {
  const shuffled = [...players].sort(() => 0.5 - Math.random());
  const pairs = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const player1 = shuffled[i];
    const player2 = shuffled[i + 1] || null; // bye if odd number
    pairs.push([player1, player2]);
  }

  return pairs;
};

// CORE START LOGIC (exported so auto-start and manual start reuse)
// NOTE: Accepts either tournament document OR tournament id (we expect doc here)
const EmailLog = require("../models/EmailLog");
const { sendmail } = require("../utils/emailService");


// -------------------- START TOURNAMENT LOGIC --------------------
// -------------------- START TOURNAMENT LOGIC --------------------
// -------------------- START TOURNAMENT LOGIC --------------------
exports.startTournamentLogic = async function startTournamentLogic(tournamentDoc) {
  let tournament = tournamentDoc;

  // ✅ If only ID was passed, fetch full tournament document
  if (!tournament._id) {
    tournament = await Tournament.findById(tournamentDoc).populate("participants createdBy");
    if (!tournament) throw new Error("Tournament not found");
  }

  // ✅ Validate participant limits
  const participantCount = tournament.participants.length;
  if (participantCount < tournament.minParticipants) {
    throw new Error(`At least ${tournament.minParticipants} participants required to start.`);
  }
  if (participantCount > tournament.maxParticipants) {
    throw new Error(`Maximum ${tournament.maxParticipants} participants allowed.`);
  }

  // ✅ Calculate prize pool dynamically
  tournament.prizePool = (tournament.entryFee || 0) * participantCount;

  // ✅ Pair players randomly
  const pairs = pairPlayers(tournament.participants);
  const matchIds = [];

  // ✅ Create matches for Round 1
  for (const [p1, p2] of pairs) {
    const match = new Match({
      player1: p1,
      player2: p2 || p1, // if odd number, assign p1 again to mark auto-win
      status: p2 ? "waiting" : "completed",
      winner: p2 ? [] : [p1],
      tournamentId: tournament._id,
      waitingStartedAt: p2 ? new Date() : null,
      joinedPlayers: p2 ? [] : [p1],
    });

    await match.save();
    matchIds.push(match._id);
  }

  // ✅ Update tournament state
  tournament.rounds.push({ roundNumber: 1, matches: matchIds });
  tournament.status = "ongoing";
  await tournament.save();

  // ✅ Notify all participants (Users)
  for (const participantId of tournament.participants) {
    const player = await User.findById(participantId);
    if (!player?.email) continue;

    const subject = `🎮 ${tournament.name} has started!`;
    const message = `
      Hi ${player.fullName || "Player"},<br><br>
      Your tournament <strong>${tournament.name}</strong> has officially started!<br>
      Check your MOOOVES dashboard to see your first match pairing.<br><br>
      Good luck and have fun!<br><br>
      — The MOOOVES Team
    `;

    const result = await sendmail(player.email, subject, message);

    await EmailLog.create({
      userId: player._id,
      tournamentId: tournament._id,
      event: "tournament_start",
      recipient: player.email,
      subject,
      body: message,
      status: result?.success ? "success" : "failed",
      error: result?.error || null,
    });
  }

  // ✅ Notify the creator (Host or User)
  const creatorModel = tournament.createdByModel === "Host" ? Host : User;
  const creator = await creatorModel.findById(tournament.createdBy);

  if (creator?.email) {
    const subject = `🏁 Your tournament "${tournament.name}" has started!`;
    const message = `
      Hi ${creator.fullName || creator.username || "Organizer"},<br><br>
      Your tournament <strong>${tournament.name}</strong> has officially started and all participants have been notified.<br>
      You can now monitor progress from your dashboard.<br><br>
      — The MOOOVES Team
    `;

    const result = await sendEmail(creator.email, subject, message);

    await EmailLog.create({
      [tournament.createdByModel === "Host" ? "hostId" : "userId"]: creator._id,
      tournamentId: tournament._id,
      event: "tournament_start",
      recipient: creator.email,
      subject,
      body: message,
      status: result?.success ? "success" : "failed",
      error: result?.error || null,
  })
  }

  return { matchIds, prizePool: tournament.prizePool };
};

// -------------------- MANUAL START ENDPOINT --------------------
exports.startTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const tournament = await Tournament.findById(id).populate("participants");

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (String(tournament.createdBy) !== String(userId)) {
      return res.status(403).json({ message: "Only the creator can start this tournament" });
    }

    if (!["scheduled", "pending"].includes(tournament.status)) {
      return res.status(400).json({ message: "Tournament already started or completed" });
    }

    try {
      await exports.startTournamentLogic(tournament);
    } catch (err) {
      // Allow host override if ?force=true
      if (req.query.force === "true") {
        tournament.minParticipants = 1;
        await exports.startTournamentLogic(tournament);
      } else {
        throw err;
      }
    }

    return res.status(200).json({
      message: "Tournament started successfully",
      tournamentId: tournament._id,
    });
  } catch (err) {
    console.error("[startTournament error]", err);
    return res.status(500).json({ message: err.message });
  }
};




// join by link
exports.joinTournamentWithLink = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const { userId } = req.body;

    const tournament = await Tournament.findOne({ inviteCode });
    if (!tournament) return res.status(404).json({ error: "Invalid invite code" });

    // disallow joining after scheduled startTime
    if (tournament.startTime && tournament.startTime <= new Date()) {
      return res.status(400).json({ error: "Joining closed: tournament has already started or the start time has passed" });
    }

    if (tournament.participants.includes(userId)) {
      return res.status(400).json({ error: "User already joined" });
    }

    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ error: "Tournament is full" });
    }

    // payment check: ensure player paid entryFee for this tournament
    const payment = await Transaction.findOne({
      user: userId,
      tournament: tournament._id,
      role: 'player',
      status: 'success',
      amount: tournament.entryFee
    });

    if (!payment) {
      return res.status(400).json({ error: `User must pay ₦${tournament.entryFee} before joining this tournament `});
    }

    tournament.participants.push(userId);
    await tournament.save();

    await User.findByIdAndUpdate(userId, { $inc: { tournamentsJoinedCount: 1 } });

    return res.json({ message: "Joined successfully", tournamentId: tournament._id, name: tournament.name, participants: tournament.participants });
  } catch (err) {
    console.error('[joinTournamentWithLink error]', err);
    return res.status(500).json({ error: err.message });
  }
};
// controllers/tournamentController.js
 

// ✅ Get all tournaments
exports.getAllTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('participants', 'username email') // show basic participant info
      .populate('createdBy'); // auto uses createdByModel for Host/User

    res.status(200).json({
      count: tournaments.length,
      tournaments
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tournaments', details: err.message });
  }
};

// ✅ Get Tournament Winners
exports.getTournamentWinners = async (req, res) => {
  try {
    const { tournamentId } = req.params;

    // 1️⃣ Find tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // 2️⃣ Check if tournament is completed
    if (tournament.status !== "completed") {
      return res.status(400).json({ 
        message: "Tournament is not yet completed. Winners will be available after the final round." 
      });
    }

    // 3️⃣ Return winners object
    return res.status(200).json({
      message: "Tournament winners retrieved successfully",
      winners: tournament.winners || { first: null, second: null, third: null }
    });

  } catch (err) {
    console.error("Get tournament winners error:", err);
    return res.status(500).json({ message: "Internal server error: " + err.message });
  }
};

// ✅ Get one tournament by ID
exports.getTournamentById = async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id)
      .populate('participants', 'username email')
      .populate('createdBy');

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.status(200).json(tournament);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tournament', details: err.message });
  }
};

// ✅ Delete a tournament
exports.deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // assuming auth middleware

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // ✅ Only creator (host or user) can delete
    if (String(tournament.createdBy) !== String(userId)) {
      return res.status(403).json({ error: 'Only the creator can delete this tournament' });
    }

    await Tournament.findByIdAndDelete(id);

    res.status(200).json({ message: 'Tournament deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tournament', details: err.message });
  }
};



// exports.joinTournament = async (req, res) => {
//   try {
//     const { userId, bluetoothToken } = req.body;

//     if (!bluetoothToken || !userId) {
//       return res.status(400).json({ error: "Bluetooth token and userId are required" });
//     }

//     const tournament = await Tournament.findOne({ bluetoothToken });
//     if (!tournament) {
//       return res.status(404).json({ error: "Tournament not found or invalid Bluetooth token" });
//     }

//     if (tournament.participants.includes(userId)) {
//       return res.status(400).json({ error: "User already joined" });
//     }

//     if (tournament.participants.length >= tournament.maxParticipants) {
//       return res.status(400).json({ error: "Tournament is full" });
//     }

//     if (tournament.entryFee < 2000 || tournament.prizePool < 100000) {
//       return res.status(400).json({ error: "Tournament does not meet minimum rules" });
//     }

//     tournament.participants.push(userId);
//     await tournament.save();

//     // Increment user stats
//     await User.findByIdAndUpdate(userId, { $inc: { tournamentsJoinedCount: 1 } });

//     res.json({
//       message: "Joined tournament via Bluetooth",
//       tournamentId: tournament._id,
//       participants: tournament.participants.length
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to join tournament", details: err.message });
//   }
// };


exports.getInviteLink = async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const inviteLink = `${process.env.BASE_URL}/api/v1/tournaments/join/${tournament.inviteCode}`;

    res.json({ inviteLink, inviteCode: tournament.inviteCode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invite link', details: err.message });
  }
};