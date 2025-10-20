const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: "Host" }, // 👈 added hostId
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" },
  event: {
    type: String,
    enum: ["tournament_start", "match_live", "auto_win", "forfeit"],
    required: true,
  },
  recipient: { type: String, required: true }, // email address
  subject: String,
  body: String, // 👈 optional: store content for transparency/auditing
  status: { type: String, enum: ["success", "failed"], default: "success" },
  error: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EmailLog", emailLogSchema);