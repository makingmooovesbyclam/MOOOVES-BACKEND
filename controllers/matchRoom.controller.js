const MatchRoom = require('../models/matchRoom');
const Match = require('../models/match');
const crypto = require('crypto');

// Create a match room with invite link
exports.createMatchRoom = async (req, res) => {
  try {
    const { userId, gameType } = req.body;
    
    const room = new MatchRoom({ user:userId, gameType,  });
    await room.save();

   const bluetoothToken = Math.random().toString(36).substring(2,10);
    res.status(201).json({ 
      message: 'Match room created', 
      roomId: room._id,
      room,
      bluetoothToken
      // inviteCode: room.inviteCode
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not create match room', details: err.message });
  }
};




// Join by roomId (Bluetooth flow)
exports.joinMatchRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, handshakeToken } = req.body;

    const room = await MatchRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!handshakeToken) return res.status(404).json({ error: 'handshakeToken not found' });


    // ✅ Check if already joined
    if (room.player1?.toString() === userId || room.player2?.toString() === userId) {
      return res.status(400).json({ error: 'User already joined this room' });
    }

    // ✅ Assign player slots
    if (!room.player1) {
      room.player1 = userId;
    } else if (!room.player2) {
      room.player2 = userId;
      room.status = 'paired'; // full room
    } else {
      return res.status(400).json({ error: 'Room is already full' });
    }

    await room.save();
    res.status(200).json({ message: 'Player added successfully', room });
  } catch (err) {
    console.error('joinMatchRoom error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
};




// ✅ Create Match Room (already done above)

// ✅ Join Match Room (already done above)

// ---------------- GET ALL ----------------
exports.getAllMatchRooms = async (req, res) => {
  try {
    const rooms = await MatchRoom.find().populate('player1 player2 user', 'username email');
    res.status(200).json({ message: "All match rooms", rooms });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch rooms', details: err.message });
  }
};

// ---------------- GET ONE ----------------
exports.getMatchRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await MatchRoom.findById(roomId).populate('player1 player2 user', 'username email');
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.status(200).json({ message: "Match room fetched", room });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch room', details: err.message });
  }
};

// // ---------------- UPDATE ----------------
// exports.updateMatchRoom = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const updates = req.body;

//     const room = await MatchRoom.findByIdAndUpdate(roomId, updates, { new: true });
//     if (!room) return res.status(404).json({ error: "Room not found" });

//     res.status(200).json({ message: "Match room updated", room });
//   } catch (err) {
//     res.status(500).json({ error: 'Could not update room', details: err.message });
//   }
// };

// ---------------- DELETE ----------------
exports.deleteMatchRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await MatchRoom.findByIdAndDelete(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    res.status(200).json({ message: "Match room deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete room', details: err.message });
  }
};