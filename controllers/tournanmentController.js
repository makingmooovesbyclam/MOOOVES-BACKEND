// controllers/tournamentController.js
const Tournament = require('../models/tournament');
const Match = require('../models/match');
const User = require('../models/user')
const Host = require('../models/host');


const Transaction = require('../models/transaction');

const crypto = require('crypto');



exports.createTournament = async (req, res) => {
  try {
    const { organizerId, name, maxPlayers } = req.body;

    if (!organizerId || !name) {
      return res.status(400).json({ error: "Host and name are required" });
    }
    if(maxPlayers > 50){
      return res.status(400).json({error:"maximum player is 50"})
    }
// 🔍 Step 1: Try to find in User collection
    let users = await User.findById(organizerId);
    let host = null;

    if (!users) {
      // 🔍 Step 2: if not found in User, check Host collection
      host = await Host.findById(organizerId);
      if (!host) {
        return res.status(404).json({ error: "Organizer not found" });
      }
    }

    //  Step 3: If it's a User, check hosting eligibility
    if (user) {
      if (!user.canHostTournament) {
        if (user.tournamentsJoinedCount < 2) {
          return res.status(403).json({
            error: "You must join at least 2 tournaments before hosting one"
          });
        }
        //  mark them as host since condition is satisfied
        user.canHostTournament = true;
        await user.save();
      }
    }


    const inviteCode = crypto.randomBytes(4).toString('hex');
// const bluetoothToken = Math.random().toString(36).substring(2,10);
  // 🔍 Step 1: Check if it's a User or Host
let creatorModel = null;

let user = await User.findById(organizerId);
if (user) {
  creatorModel = 'User';
} else {
  let host = await Host.findById(organizerId);
  if (host) {
    creatorModel = 'Host';
  } else {
    return res.status(404).json({ error: "Organizer not found" });
  }
}

// 🔍 Step 2: Create tournament with dynamic createdByModel
const tournament = new Tournament({
  name,
  createdBy: organizerId,
  createdByModel: creatorModel,   // 👈 key part
  participants: [],
  maxParticipants: maxPlayers,
  entryFee: entryFee,
  prizePool: 0,
  inviteCode,
  status: 'pending'
});


    await tournament.save();
  const inviteLink = `${process.env.BASE_URL}/api/v1/tournaments/join/${tournament.inviteCode}`
    res.status(201).json({
      message: "Tournament created successfully",
      // tournamentId: tournament._id,
      tournament,
      inviteLink,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

exports.startTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // assuming middleware sets this
    const tournament = await Tournament.findById(id).populate('participants');

    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (tournament.status !== 'pending') {
      return res.status(400).json({ message: 'Tournament already started or completed' });
    }
    // ✅ Ensure only the creator (Host or User) can start
if (String(tournament.createdBy) !== String(userId)) {
  return res.status(403).json({ message: 'Only the creator can start this tournament' });
}

// // ✅ Check payment depending on creator type
// let requiredRole = tournament.createdByModel === 'Host' ? 'host' : 'user';

// const creatorPayment = await Transaction.findOne({
//   user: userId,
//   tournament: id,`
//   role: requiredRole,
//   status: 'success',
//   amount: 1000   // or make this dynamic if fee differs
// });

// if (!creatorPayment) {
//   return res.status(400).json({ 
//     message: `${tournament.createdByModel} must pay ₦1000 fee before starting tournament `
//   });
// }
   
    //
    if (tournament.participants.length < tournament.minParticipants) {
      return res.status(400).json({
        message: `At least ${tournament.minParticipants} participants required to start.`
      });
    }
    if (tournament.participants.length > tournament.maxParticipants) {
      return res.status(400).json({
        message:` Maximum ${tournament.maxParticipants} participants allowed.`
      });
    }

    // lock prize pool
    tournament.prizePool = tournament.entryFee * tournament.participants.length;

    // ✅ pair participants (1v1 matches only)
    const pairs = pairPlayers(tournament.participants);
    const matchIds = [];

    for (const [player1, player2] of pairs) {
      const match = new Match({
        players: player2 ? [player1, player2] : [player1], // bye if no opponent
        status: player2 ? 'ongoing' : 'completed',
        winner: player2 ? null : player1, // auto-advance if bye
        // matchRoomId: null
      });
      await match.save();
      matchIds.push(match._id);
    }

    tournament.rounds.push({ roundNumber: 1, matches: matchIds });
    tournament.status = 'ongoing';
    await tournament.save();

    return res.status(200).json({
      message: 'Tournament started',
      matches: matchIds,
      prizePool: tournament.prizePool
    });
  } catch (error) {
    console.error('Start tournament error:', error);
    res.status(500).json({ message: 'Internal error: ' + error.message });
  }
};
exports.joinTournamentWithLink = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const { userId } = req.body;

    const tournament = await Tournament.findOne({ inviteCode });

    if (!tournament) return res.status(404).json({ error: "Invalid invite code" });

    if (tournament.participants.includes(userId)) {
      return res.status(400).json({ error: "User already joined" });
    }

    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ error: "Tournament is full" });
    }
// 4. Check payment (must have a successful ₦2000 player transaction for this tournament)
    const payment = await Transaction.findOne({
      user: userId,
      tournament: tournament._id,
      role: 'player',
      amount,
      status: 'success'
    });

    if (!payment) {
      return res.status(400).json({ error: "User must pay ₦2000 before joining this tournament" });
    }

    //add user
    tournament.participants.push(userId);
    await tournament.save();
// 6. Update user's joined count
    await User.findByIdAndUpdate(userId, { $inc: { tournamentsJoinedCount: 1 } });
    res.json({ message: "Joined successfully", tournamentId: tournament._id,name:tournament.name,particionts:tournament.participants });
  } catch (err) {
    res.status(500).json({ error: err.message });
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