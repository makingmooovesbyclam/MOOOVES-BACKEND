const mongoose = require('mongoose');

const moveSchema = new mongoose.Schema({
  playerId: String,
  move: Object,
  timestamp: { type: Date, default: Date.now }
});

const matchSchema = new mongoose.Schema({
  matchRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatchRoom',
    required: true
  },
  player1: String,
  player2: String,
  status: {
    type: String,
    enum: ['pending', 'ongoing', 'completed'],
    default: 'pending'
  },
  winner: String,
  handshakeToken: String,

  // ✅ New gameState object
  gameState: {
    board: {
      type: [[String]],
      default: [['', '', ''], ['', '', ''], ['', '', '']]
    },
    moves: [moveSchema],
    movesMade: {
      type: Number,
      default: 0
    },
    currentTurn: {
      type: String // or mongoose.Schema.Types.ObjectId if you prefer linking to User
    }
  }
});

module.exports = mongoose.model('Match', matchSchema);