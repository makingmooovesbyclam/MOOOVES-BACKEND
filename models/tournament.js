// models/Tournament.js
const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: String,
  hostId: String,
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentRound: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['pending', 'ongoing', 'completed'],
    default: 'pending'
  },
  rounds: [{
    roundNumber: Number,
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }]
  }]
});

module.exports = mongoose.model('Tournament', tournamentSchema);