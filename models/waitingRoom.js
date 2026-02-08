const mongoose = require("mongoose");

const tournamentParticipantSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  status: {
    type: String,
    enum: ["WAITING", "PLAYING", "ELIMINATED"],
    default: "WAITING"
  },

  joinedAt: {
    type: Date,
    default: Date.now
  }
});

tournamentParticipantSchema.index(
  { tournamentId: 1, userId: 1 },
  { unique: true }
);

// module.exports = mongoose.model(
//   "TournamentParticipant",
//   tournamentParticipantSchema
// );

const TournamentParticipant = mongoose.model('tournanment', tournamentParticipantSchema)
module.exports = TournamentParticipant