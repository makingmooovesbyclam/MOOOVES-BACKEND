const MatchRoom = require('../models/matchRoom');

exports.createMatchRoom = async (req, res) => {
  try {
    const { hostId, gameType } = req.body;
    const room = new MatchRoom({ hostId, gameType });
    await room.save()
    res.status(201).json({ message: 'Match room created', room });
  } catch (err) {
    res.status(500).json({ error: 'Could not create match room' , details: err.message});
  }
};

// Add player to room (e.g., after Bluetooth handshake)
exports.joinMatchRoom = async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;

  const room = await MatchRoom.findById(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (room.players.includes(userId)) {
    return res.status(400).json({ error: 'User already joined' });
  }

  room.players.push(userId);
  if (room.players.length === 2) room.status = 'paired';

  await room.save();
  res.status(200).json({ message: 'Player added', room });
};