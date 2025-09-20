const mongoose = require('mongoose');

const matchRoomSchema = new mongoose.Schema({
   user: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
      },
  
  gameType: { type: String, enum: ['TicTacToe', 'Chess'], default: 'TicTacToe' },
  status: { type: String, enum: ['waiting', 'paired', 'started', 'ended'], default: 'waiting' },

  // use explicit slots
  player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  handshakeToken: String, // for offline verification
  inviteCode: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});



const MatchRoom = mongoose.model('MatchRoom', matchRoomSchema)

module.exports = MatchRoom