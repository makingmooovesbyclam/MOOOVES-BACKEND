// models/Tournament.js
const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  
  createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  refPath: 'createdByModel'
},
createdByModel: {
  type: String,
  enum: ['Host', 'User'],
  required: true
},
  //  bluetoothToken: String, // for offline verification
  inviteCode:{type:String , unique:true},
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  entryFee: {
    type: Number,
    required: false,
    // min: 2000 // minimum entry is ₦2000
  },
  prizePool: {
    type: Number,
    required: false,
    min: 100000 // minimum prize pool ₦100k
  },
  // durationMinutes: {
  //   type: Number,
  //   default: 10 // all tournaments are fixed 10 minutes in MVP
  // },
  currentRound: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'ongoing', 'completed'],
    default: 'pending'
  },
  rounds: [{
    roundNumber: Number,
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }]
  }],
  // ✅ Add winners field
  winners: {
    first: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },  // Champion
    second: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Runner-up
    third: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }   // Semi-final loser
  },
  minParticipants: {
    type: Number,
    default: 6
  },
  maxParticipants: {
    type: Number,
    default: 50
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tournament', tournamentSchema);


const Tournament = mongoose.model('Tournament', tournamentSchema)

module.exports = Tournament;