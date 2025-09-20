const Match = require('../models/match');
const User = require('../models/user');

exports.createHandshake = async (req, res) => {
  console.log('received:', req.body);
  const { players, matchRoomId } = req.body;

  // ✅ Ensure exactly 2 players for 1v1
  if (!players  || !Array.isArray(players) || players.length !== 2 || !matchRoomId) {
    return res.status(400).json({ error: 'Exactly 2 players and a matchRoomId are required' });
  }

  try {
    // Validate both users exist
    const users = await User.find({ _id: { $in: players } });
    if (users.length !== 2) {
      return res.status(404).json({ error: 'One or both players not found' });
    }

    // Generate a handshake token for this 1v1 match session
    const handshakeToken = Math.random().toString(36).substring(2, 10);

    // Create new match document
    const match = new Match({
      players,
      matchRoomId,
      status: 'ongoing',
      handshakeToken,
    });

    await match.save();

    return res.status(200).json({
      message: 'Generated 1v1 offline handshake',
      matchId: match._id,
      handshakeToken,
    });
  } catch (err) {
    console.error('createHandshake error:', err);
    return res.status(500).json({ error: err.message });
  }
};