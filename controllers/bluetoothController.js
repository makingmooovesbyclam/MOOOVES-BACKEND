const Match = require('../models/match');
const User = require('../models/user')
exports.createHandshake = async (req, res) => {
    console.log('received:',req.body);
  const { player1, player2 ,matchRoomId} = req.body;
  if (!player1 || !player2 || !matchRoomId) {
    return res.status(400).json({ error: 'Both player1, matchRoomId and player2 are required' });
  }


  try {

     // Validate users
    const [user1, user2] = await Promise.all([
      User.findById(player1),
      User.findById(player2)
    ]);

    if (!user1 || !user2) {
      return res.status(404).json({ error: 'One or both users not found' });
    }
    const handshakeToken = Math.random().toString(36).substring(2, 10);

    const match = new Match({
      player1,
      player2,
      matchRoomId,
      status: 'ongoing',
      handshakeToken
    });
 await match.save()
    res.status(200).json({ message: 'generate offline handshake', matchId: match._id, handshakeToken });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message });
  }
};