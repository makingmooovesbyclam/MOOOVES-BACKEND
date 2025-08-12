const Match = require('../models/match');
const { checkWinner } = require('../utils/gameUtils');

exports.makeMove = async (req, res) => {
  try {
    // const { matchid } = req.params;
    const { playerId, row, col, symbol,matchid } = req.body;

    const normalizedSymbol = symbol?.toUpperCase();
if (!playerId || row === undefined || col === undefined || !symbol || !matchid)  {
  return res.status(400).json({ message: 'Missing one or more required fields: playerId, row, col, symbol' });
}

if (![0, 1, 2].includes(row) || ![0, 1, 2].includes(col)) {
  return res.status(400).json({ message: 'Invalid board position' });
}

if (!['X', 'O'].includes(normalizedSymbol)) {
  return res.status(400).json({ message: 'Invalid symbol. Must be X or O' });
}
    const match = await Match.findById(matchid);
     if (!match) return res.status(404).json({ message: 'Match not found' });
     if (!match.gameState) {
  match.gameState = {
    board: [
      ['', '', ''],
      ['', '', '']
    ],
    movesMade: 0,
    currentTurn: match.player1
  };
}
    const board = match.gameState.board;
    if (board[row][col]) return res.status(400).json({ message: 'Cell already taken' });

    // Validate turn
    if (match.gameState.currentTurn !== playerId)
      return res.status(403).json({ message: 'Not your turn' });

    // Make move
    board[row][col] = normalizedSymbol;
    match.gameState.movesMade++;
    match.gameState.currentTurn = playerId === match.player1 ? match.player2 : match.player1;

    // Check win/draw
    const outcome = checkWinner(board);
    if (outcome === 'X' || outcome === 'O') {
      match.matchStatus = 'completed';
      match.winner = outcome === 'X' ? match.player1 : match.player2;
    } else if (outcome === 'draw') {
      match.matchStatus = 'completed';
      match.winner = 'draw';
    }

    await match.save();
    return res.status(200).json({ message: 'Move made', match });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal error' +err.message});
  }
};

const MatchRoom = require('../models/matchRoom');

exports.createMatch = async (req, res) => {
  try {
    const { matchRoomId, player1, player2, handshakeToken } = req.body;

    if (!matchRoomId || !player1 || !player2 || !handshakeToken) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const matchRoom = await MatchRoom.findById(matchRoomId);
    if (!matchRoom) {
      return res.status(404).json({ message: 'Match room not found' });
    }

    // ✅ Validate handshakeToken
    const handshake = await Match.findOne({ handshakeToken });
    if (!handshake) {
      return res.status(403).json({ message: 'Invalid handshake token' });
    }

    // ✅ Create new match instance with gameState
    const newMatch = new Match({
      player1,
      player2,
      handshakeToken,
      matchRoomId,
      status: 'ongoing',
      gameState: {
        board: [['', '', ''], ['', '', ''], ['', '', '']],
        movesMade: 0,
        currentTurn: player1
      }
    });

    await newMatch.save();
    console.log("matchid:", newMatch._id);

    return res.status(201).json({
      message: 'Match created successfully',
      match: newMatch,
    });
  } catch (error) {
    console.error('Create match error:', error);
    return res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};




const Tournament = require('../models/tournament');
const { pairPlayers } = require('../utils/pairing');

exports.submitResult = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { winnerId } = req.body;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.status === 'completed') return res.status(400).json({ message: 'Match already completed' });

    match.status = 'completed';
    match.winner = winnerId;
    await match.save();

    // Find the tournament containing this match
    const tournament = await Tournament.findOne({ 'rounds.matches': match._id });

    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const currentRound = tournament.rounds.find(r => r.roundNumber === tournament.currentRound);
    const allMatches = await Match.find({ _id: { $in: currentRound.matches } });

    const roundComplete = allMatches.every(m => m.status === 'completed');

    // If round complete, start next round
    if (roundComplete) {
      const winners = allMatches.map(m => m.winner);
      const pairs = pairPlayers(winners);
      const newMatchIds = [];

      for (const [p1, p2] of pairs) {
        const newMatch = new Match({
          player1: p1,
          player2: p2,
          status: p2 ? 'ongoing' : 'completed',
          winner: p2 ? null : p1,
          matchRoomId: null
        });
        await newMatch.save();
        newMatchIds.push(newMatch._id);
      }

      tournament.rounds.push({
        roundNumber: tournament.currentRound + 1,
        matches: newMatchIds
      });

      tournament.currentRound += 1;

      // Check if final winner
      if (winners.length === 1) {
        tournament.status = 'completed';
      }

      await tournament.save();
    }

    return res.status(200).json({ message: 'Result submitted successfully', match });
  } catch (error) {
    console.error('Submit result error:', error);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};