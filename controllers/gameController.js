const Match = require('../models/match');
const MatchRoom = require('../models/matchRoom');
const { checkWinner } = require('../utils/gameUtils');

// ✅ Create Match (works for 1v1 handshake or tournament)
// ✅ Create Match (strictly 1v1)
exports.createMatch = async (req, res) => {
  try {
    const { matchRoomId, player1, player2 } = req.body;

    // ✅ Ensure exactly 2 players provided
    if (!matchRoomId || !player1  || !player2) {
      return res.status(400).json({ message: 'Match requires a room and exactly 2 players' });
    }

    const matchRoom = await MatchRoom.findById(matchRoomId);
    if (!matchRoom) {
      return res.status(404).json({ message: 'Match room not found' });
    }

    const newMatch = new Match({
      player1,
      player2,
      
      matchRoomId,
      status: 'ongoing',
      gameState: {
        board: Array.from({ length: 30 }, () => Array(30).fill('')), // 30x30 board
        movesMade: 0,
        currentTurn: player1 // first player starts
      },
      startedAt: new Date(),
  endsAt: new Date(Date.now() + 10 * 60 * 1000) // ✅ 10 minutes from start
    });

    await newMatch.save();

    return res.status(201).json({
      message: '1v1 Match created successfully',
      match: newMatch,
    });
  } catch (error) {
    console.error('Create match error:', error);
    return res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};
// helper: check for 5-in-a-row
// ✅ Utility function to check 5 in a row
function checkFive(board, row, col, symbol) {
  const directions = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal down-right
    [1, -1]  // diagonal up-right
  ];

  for (let [dr, dc] of directions) {
    let streak = 1;

    // forward
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < 30 && c >= 0 && c < 30 && board[r][c] === symbol) {
      streak++;
      r += dr; c += dc;
    }

    // backward
    r = row - dr; c = col - dc;
    while (r >= 0 && r < 30 && c >= 0 && c < 30 && board[r][c] === symbol) {
      streak++;
      r -= dr; c -= dc;
    }

    if (streak >= 5) return true; // ✅ winner found
  }
  return false;
}

// ✅ Utility function to calculate score (when no 5-in-a-row winner)
function calculateScore(board, symbol) {
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];

  let score = 0;

  for (let r = 0; r < 30; r++) {
    for (let c = 0; c < 30; c++) {
      if (board[r][c] !== symbol) continue;

      for (let [dr, dc] of directions) {
        let streak = 1;
        let nr = r + dr, nc = c + dc;

        while (nr >= 0 && nr < 30 && nc >= 0 && nc < 30 && board[nr][nc] === symbol) {
          streak++;
          nr += dr; nc += dc;
        }

        // give points for streaks < 5
        if (streak === 2) score += 1;
        if (streak === 3) score += 3;
        if (streak === 4) score += 5;
      }
    }
  }

  return score;
}

exports.makeMove = async (req, res) => {
  try {
    const { playerId, row, col, matchid } = req.body;

    if (!playerId || row === undefined || col === undefined || !matchid) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (row < 0 || row > 29 || col < 0 || col > 29) {
      return res.status(400).json({ message: 'Invalid board position' });
    }

    const match = await Match.findById(matchid);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.status === 'completed') {
      return res.status(400).json({ 
        message: 'Match already ended', 
        winner: match.winner || null 
      });
    }

    const board = match.gameState.board;
    if (board[row][col]) {
      return res.status(400).json({ message: 'Cell already taken' });
    }

    // ✅ Ensure correct turn
    if (String(match.gameState.currentTurn) !== String(playerId)) {
      return res.status(403).json({ message: 'Not your turn', winner: null });
    }

    // ✅ Decide symbol (X for player1, O for player2)
    let symbol;
    if (String(match.player1) === String(playerId)) {
      symbol = "X";
    } else if (String(match.player2) === String(playerId)) {
      symbol = "O";
    } else {
      return res.status(403).json({ message: 'You are not part of this match' });
    }

    // ✅ Make move
    board[row][col] = symbol;
    match.gameState.moves.push({ playerId, symbol, move: { row, col } });
    match.gameState.movesMade++;

    let winner = null;

    // ✅ Check 5-in-a-row winner
    if (checkFive(board, row, col, symbol)) {
      match.status = 'completed';
      match.winner = playerId;
      winner = playerId;
    } 
    else {
      // ✅ Check board full or time expired
      const boardFull = match.gameState.movesMade >= 30 * 30;
      const timeExpired = new Date() >= match.endsAt;

      if (boardFull || timeExpired) {
        const scoreX = calculateScore(board, "X");
        const scoreO = calculateScore(board, "O");

        if (scoreX > scoreO) {
          winner = match.player1;
        } else if (scoreO > scoreX) {
          winner = match.player2;
        } else {
          winner = null; // draw
        }

        match.status = 'completed';
        match.winner = winner;
      } else {
        // ✅ Switch turn if no winner yet
        if (String(match.player1) === String(playerId)) {
          match.gameState.currentTurn = match.player2;
        } else {
          match.gameState.currentTurn = match.player1;
        }
      }
    }

    await match.save();

    return res.status(200).json({
      message: winner? (checkFive(board, row, col, symbol) ? "Winner decided by 5 in a row" : "Winner decided by score")
        : (match.status === 'completed' ? "Match ended in a draw" : "Move made"),
      match,
      winner
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal error ' + err.message });
  }
};

exports.submitOfflineResult = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { winnerId } = req.body;

    // 1️⃣ Find match
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (match.status === "completed") {
      return res.status(400).json({ message: "Match already completed" });
    }

    // 2️⃣ Validate winner is one of the players
    if (![match.player1?.toString(), match.player2?.toString()].includes(winnerId)) {
      return res.status(400).json({ message: "Invalid winner: must be one of the players" });
    }

    // 3️⃣ Mark result
    match.status = "completed";
    match.winner = [winnerId];   // ✅ only store winner
    match.first = winnerId;      // ✅ optional, set "first" for consistency
    match.second =
      winnerId === match.player1?.toString()
        ? match.player2?.toString()
        : match.player1?.toString();
    match.third = null;          // ❌ not used in 1v1
    match.completedAt = new Date();

    await match.save();

    return res.status(200).json({
      message: "1v1 match result submitted successfully",
      match,
    });
  } catch (error) {
    console.error("Offline match result error:", error);
    return res.status(500).json({ message: "Internal server error: " + error.message });
  }
};

const Tournament = require('../models/tournament');
const { pairPlayers } = require('../utils/pairing');

// ✅ submitResult.js



// 🔹 Helper to compute top 3 placements
const computeWinners = async (tournament) => {
  const lastRound = tournament.rounds[tournament.rounds.length - 1];
  const finalMatches = await Match.find({ _id: { $in: lastRound.matches } });

  let first = null, second = null, third = null;

  // If tournament ended → only 1 final match
  if (finalMatches.length === 1) {
    const final = finalMatches[0];
    const finalPlayers = [final.player1, final.player2].filter(Boolean);

    if (final.winner && final.winner.length > 0) {
      first = final.winner[0];
      second = first ? finalPlayers.find(uid => uid.toString() !== first.toString()) : null;
    } else {
      // unfinished → placeholders
      first = finalPlayers[0] || null;
      second = finalPlayers[1] || null;
    }

    // ✅ third place comes from semifinal losers
    const semiRound = tournament.rounds.find(r => r.roundNumber === tournament.currentRound - 1);
    if (semiRound) {
      const semiMatches = await Match.find({ _id: { $in: semiRound.matches } });
      const semiLosers = semiMatches.map(m => {
        const players = [m.player1, m.player2].filter(Boolean);
        return players.find(uid => !m.winner?.includes(uid));
      }).filter(Boolean);

      third = semiLosers.find(uid => uid.toString() !== second?.toString()) || semiLosers[0] || null;
    }
  }

  return { first, second, third };
};


// 🔹 Controller
exports.submitResult = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { winnerId } = req.body;

    // 1️⃣ Find match
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    if (match.status === "completed") {
      return res.status(400).json({ message: "Match already completed" });
    }

    const now = new Date();

    // 2️⃣ Expired → mark no winner
    if (now >= match.endsAt) {
      match.status = "completed";
      match.winner = [];
      await match.save();
    } else {
      // 3️⃣ Normal submission
      match.status = "completed";
      match.winner = winnerId ? [winnerId] : [];
      await match.save();
    }

    // 4️⃣ Must belong to a tournament
    const tournament = await Tournament.findOne({ "rounds.matches": match._id });
    if (!tournament) {
      return res.status(400).json({ message: "This match is not part of a tournament" });
    }

    // 5️⃣ Check if current round finished
    const currentRound = tournament.rounds.find(r => r.roundNumber === tournament.currentRound);
    const allMatches = await Match.find({ _id: { $in: currentRound.matches } });

    const roundComplete = allMatches.every(m => m.status === "completed");

    if (roundComplete) {
      // Collect round winners
      const roundWinners = allMatches
        .map(m => (m.winner?.length > 0 ? m.winner[0] : null))
        .filter(Boolean);

      if (roundWinners.length === 1) {
        // ✅ Tournament ends
        const winners = await computeWinners(tournament);
        tournament.status = "completed";
        tournament.winners = winners;
        await tournament.save();

        return res.status(200).json({
          message: "Tournament completed",
          match,
          winners,
        });
      }

      // ➡️ Create next round
      const pairs = pairPlayers(roundWinners);
      const newMatchIds = [];

      for (const [p1, p2] of pairs) {
        if (!p2) {
          // bye
          const byeMatch = new Match({
            tournamentId: [tournament._id],
            player1: p1,
            player2: null,
            status: "completed",
            winner: [p1],
            gameState: {
              board: Array(30).fill().map(() => Array(30).fill("")),
              moves: [],
              movesMade: 0,
              currentTurn: p1,
            },
            startedAt: now,
            endsAt: new Date(now.getTime() + 10 * 60 * 1000),
          });
          await byeMatch.save();
          newMatchIds.push(byeMatch._id);
        } else {
          const newMatch = new Match({
            tournamentId: [tournament._id],
            player1: p1,
            player2: p2,
            status: "ongoing",
            winner: [],
            gameState: {
              board: Array(30).fill().map(() => Array(30).fill("")),
              moves: [],
              movesMade: 0,
              currentTurn: p1,
            },
            startedAt: now,
            endsAt: new Date(now.getTime() + 10 * 60 * 1000),
          });
          await newMatch.save();
          newMatchIds.push(newMatch._id);
        }
      }

      tournament.rounds.push({
        roundNumber: tournament.currentRound + 1,
        matches: newMatchIds,
      });
      tournament.currentRound += 1;

      await tournament.save();
    }

    return res.status(200).json({
      message: "Result submitted successfully",
      match,
      winners: tournament.status === "completed" ? tournament.winners : null,
    });
  } catch (err) {
    console.error("Submit result error:", err);
    res.status(500).json({ message: "Internal server error: " + err.message });
  }
};


// GET all matches
exports.getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find();
    res.status(200).json(matches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

// GET one match by ID
exports.getMatchById = async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.status(200).json(match);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
};

// DELETE match
exports.deleteMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findByIdAndDelete(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.status(200).json({ message: 'Match deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete match' });
  }
};
// ✅ Create Tournament Match
// exports.createTournamentMatch = async (req, res) => {
//   try {
//     const { tournamentId, players } = req.body;

//     if (!tournamentId ||  !players || players.length < 2) {
//       return res.status(400).json({ message: 'Tournament match requires a tournamentId and at least 2 players' });
//     }

//     // ✅ Check if tournament exists
//     const tournament = await Tournament.findById(tournamentId);
//     if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

//     // ✅ Create a new match linked to the tournament
//     const newMatch = new Match({
//       players: players.map(p => ({ userId: p })),
//       tournamentId,
//       status: 'ongoing',
//       gameState: {
//         board: Array.from({ length: 30 }, () => Array(30).fill('')),
//         movesMade: 0,
//         currentTurn: players[0] // first player starts
//       },
//       startedAt: new Date(),
//       endsAt: new Date(Date.now() + 10 * 60 * 1000) // fixed 10 min
//     });

//     await newMatch.save();

//     // ✅ Auto-scheduler to complete the tournament after 10min
//     setTimeout(async () => {
//       const match = await Match.findById(newMatch._id);
//       if (match && match.status === 'ongoing') {
//         match.status = 'completed';
//         await match.save();

//         // ✅ Update tournament status
//         const tournament = await Tournament.findById(tournamentId);
//         if (tournament) {
//           tournament.status = 'completed';
//           await tournament.save();
//         }
//       }
//     }, 10 * 60 * 1000);

//     return res.status(201).json({
//       message: 'Tournament match created successfully',
//       match: newMatch,
//     });

//   } catch (error) {
//     console.error('Create tournament match error:', error);
//     return res.status(500).json({ message: 'Internal server error: ' + error.message });
//   }
// };

