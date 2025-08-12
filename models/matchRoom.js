const mongoose = require('mongoose');

const matchRoomSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', required: true },
  gameType: { type: String, enum: ['TicTacToe', 'Chess'], default: 'TicTacToe' },
  status: { type: String, enum: ['waiting', 'paired', 'started', 'ended'], default: 'waiting' },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bluetoothToken: String, // for offline verification
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MatchRoom', matchRoomSchema);