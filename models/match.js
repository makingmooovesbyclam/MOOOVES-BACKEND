const mongoose = require('mongoose');

const moveSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  move: Object, // {row, col}
  timestamp: { type: Date, default: Date.now }
});

const matchSchema = new mongoose.Schema({
  matchRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatchRoom',
    required: true
  },

  player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
  
  // keep original statuses but extend with waiting/forfeited
  status: {
    type: String,
    enum: ['pending', 'waiting', 'ongoing', 'completed', 'cancelled','declined','forfeited'],
    default: 'pending'
  },

  winner: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // ✅ supports ties
  handshakeToken: String,
  tournamentId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }], // ✅ supports ties
  

  gameState: {
    board: {
      type: [[String]],
      default: Array(30).fill().map(() => Array(30).fill("")) // ✅ 30x30
    },
    rematchId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Match',
  default: null
},


    moves: [moveSchema],
    movesMade: { type: Number, default: 0 },
    currentTurn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
// WAITING ROOM FIELDS
  waitingStartedAt: { type: Date, default: null },     // when waiting window began
  joinedPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // players who joined the match
  
  startedAt: { type: Date, default: Date.now },
  endsAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

matchSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (!this.endsAt) {
    this.endsAt = new Date(this.startedAt.getTime() + 10 * 60 * 1000); // 10 min
  }
  next();
});


const Match = mongoose.model('Match', matchSchema)

module.exports = Match;