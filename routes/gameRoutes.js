const express = require('express');
const router = express.Router();
const { makeMove ,createMatch,
  make1v1Move,
  requestRematch,
  declineRematch} = require('../controllers/gameController');

const matchController = require('../controllers/gameController');
const {authMiddleware}  = require('../middlewares/authMiddleware')




/**
 * @swagger
 * {
 *   "tags": [
 *     {
 *       "name": "1v1 Matches",
 *       "description": "1-on-1 live match endpoints"
 *     }
 *   ]
 * }
 */

/**
 * @swagger
 * {
 *   "/api/v1/matches": {
 *     "post": {
 *       "tags": ["1v1 Matches"],
 *       "summary": "Create a new 1v1 match",
 *       "description": "Creates a new 1v1 match after both players have joined a match room. Initializes the board, turn order, and 10-minute timer.",
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "example": {
 *               "roomId": "64fa1234abcd5678ef901234"
 *             }
 *           }
 *         }
 *       },
 *       "responses": {
 *         "201": {
 *           "description": "Match created successfully"
 *         },
 *         "400": {
 *           "description": "Both players must join first"
 *         }
 *       }
 *     }
 *   }
 * }
 */
router.post('/matches', createMatch);



/**
 * @swagger
 * {
 *   "/api/v1/matches/{matchId}/move": {
 *     "post": {
 *       "tags": ["1v1 Matches"],
 *       "summary": "Submit a move in a 1v1 match",
 *       "description": "Validates player turn, board position, timer, and determines win, draw, or ongoing state.",
 *       "parameters": [
 *         {
 *           "name": "matchId",
 *           "in": "path",
 *           "required": true,
 *           "schema": { "type": "string" }
 *         }
 *       ],
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "example": {
 *               "playerId": "64fa1111abcd2222ef333333",
 *               "row": 1,
 *               "col": 2,
 *               "symbol": "X"
 *             }
 *           }
 *         }
 *       },
 *       "responses": {
 *         "200": {
 *           "description": "Move accepted / game result",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "message": "Game won",
 *                 "result": "win",
 *                 "winnerId": "64fa1111abcd2222ef333333",
 *                 "board": [
 *                   ["X", "O", "X"],
 *                   ["O", "X", ""],
 *                   ["", "", "X"]
 *                 ]
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "description": "Invalid move or turn"
 *         }
 *       }
 *     }
 *   }
 * }
 */
router.post('/matches/:matchId/move', make1v1Move);



/**
 * @swagger
 * {
 *   "/api/v1/matches/{matchId}/rematch": {
 *     "post": {
 *       "tags": ["1v1 Matches"],
 *       "summary": "Request a rematch",
 *       "description": "Creates a new match using the same players and settings. If a rematch already exists, it returns the existing match ID.",
 *       "parameters": [
 *         {
 *           "name": "matchId",
 *           "in": "path",
 *           "required": true,
 *           "schema": { "type": "string" }
 *         }
 *       ],
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "example": {
 *               "userId": "64fa1111abcd2222ef333333"
 *             }
 *           }
 *         }
 *       },
 *       "responses": {
 *         "201": {
 *           "description": "Rematch created",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "success": true,
 *                 "data": {
 *                   "newMatchId": "64fa9999abcd8888ef777777"
 *                 }
 *               }
 *             }
 *           }
 *         },
 *         "200": {
 *           "description": "Rematch already exists"
 *         }
 *       }
 *     }
 *   }
 * }
 */
router.post('/matches/:matchId/rematch', requestRematch);

/**
 * @swagger
 * {
 *   "/api/v1/matches/{matchId}/decline": {
 *     "post": {
 *       "tags": ["1v1 Matches"],
 *       "summary": "Decline a rematch",
 *       "description": "Allows a player to decline a rematch request. The match is marked as declined.",
 *       "parameters": [
 *         {
 *           "name": "matchId",
 *           "in": "path",
 *           "required": true,
 *           "schema": { "type": "string" }
 *         }
 *       ],
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "example": {
 *               "userId": "64fa1111abcd2222ef333333"
 *             }
 *           }
 *         }
 *       },
 *       "responses": {
 *         "200": {
 *           "description": "Rematch declined",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "success": true
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
router.post('/matches/:matchId/decline', declineRematch);





/**
 * @swagger
 * /api/v1/{matchId}/submit-result:
 *   post:
 *     summary: Submit a result for a tournament match
 *     description: >
 *       This endpoint records the result of a given match in a tournament.  
 *       Logic flow:  
 *       - A match is played between 2 players (player1 vs player2).  
 *       - Once the result is submitted, the winner is saved in the winner field.  
 *       - The backend pairs winners of the current round to create the next round.  
 *       - This continues until the final round produces a single champion.  
 *       - The top 3 placements (1st, 2nd, 3rd) are recorded for tournaments.  
 *
 *       Why important? This is the core of the tournament flow. Without submitting results, the system cannot know who advances to the next round or how to distribute rankings and prizes.
 *     tags: [Games]
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the match
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               winnerId:
 *                 type: string
 *                 example: "64f9c23d8f9b1234abcd5678"
 *     responses:
 *       200:
 *         description: Result submitted successfully and next round generated if applicable
 *         content:
 *           application/json:
 *             example:
 *               message: "Result submitted"
 *               matchId: "64f9c23d8f9b1234abcd5678"
 *               winner: "64f9c23d8f9b1234abcd5678"
 *       400:
 *         description: Invalid match or already completed
 *         content:
 *           application/json:
 *             example:
 *               error: "Match already has a winner"
 *       404:
 *         description: Match not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Match not found"
  *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Failed "
 */
router.post('/:matchId/submit-result', matchController.submitResult);


/**
 * @swagger
 * /api/v1/{matchId}/submit-resultoffline:
 *   post:
 *     summary: Submit a result for an offline (Bluetooth) tournament match
 *     description: >
 *       Used when players compete offline (e.g., via Bluetooth handshake).  
 *       The system validates the handshakeToken from the match object to ensure the result is genuine.  
 *       After verification, the result is saved and the winner progresses just like in online tournaments.
 *     tags: [Games]
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Match ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               winnerId:
 *                 type: string
 *               handshakeToken:
 *                 type: string
 *             example:
 *               winnerId: "64f9c23d8f9b1234abcd5678"
 *               handshakeToken: "bluetooth-secret-123"
 *     responses:
 *       200:
 *         description: Offline result accepted
 *       400:
 *         description: Invalid match or already completed
 *         content:
 *           application/json:
 *             example:
 *               error: "Match already has a winner"
 *       404:
 *         description: Match not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Match not found"
  *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Failed "
 */
router.post('/:matchId/submit-resultoffline', matchController.submitOfflineResult);
/**
 * @swagger
 * /api/v1/move:
 *   post:
 *     summary: Make a move in an active match
 *     description: |
 *       This endpoint allows a player to make a move in a Tic-Tac-Toe style tournament game.  
 *       - Each player is assigned a symbol: X (player1) or O (player2).  
 *       - A player must play only when it's their turn.  
 *       - The system checks for a winner after each move.  
 *       
 *       Winning logic:
 *       1. Immediate Win: If a player forms 5 in a row (horizontal, vertical, diagonal, or anti-diagonal), they win immediately.  
 *       2. Highest Score Win: If no 5 in a row and the game ends (board full or time expired), the winner is decided by highest score.  
 *          - Scoring: 2 in a row = 1 point, 3 in a row = 3 points, 4 in a row = 5 points.  
 *       3. Draw: If both players have equal scores when the game ends, the match is a draw.  
 *     tags: [Games]
  *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playerId
 *               - row
 *               - col
 *               - matchid
 *             properties:
 *               playerId:
 *                 type: string
 *                 example: "64fc98e9a8120c2b4d3f1234"
 *               row:
 *                 type: integer
 *                 example: 5
 *               col:
 *                 type: integer
 *                 example: 8
 *               matchid:
 *                 type: string
 *                 example: "650b7d9a87f91345c1234567"
 *     responses:
 *       200:
 *         description: Move successfully made (or game ended)
 *         content:
 *           application/json:
 *             examples:
 *               MoveMade:
 *                 summary: Move made (no winner yet)
 *                 value:
 *                   message: "Move made"
 *                   winner: null
 *                   match: { ... }
 *               WinnerByFive:
 *                 summary: Player won by 5 in a row
 *                 value:
 *                   message: "Winner decided by 5 in a row"
 *                   winner: "64fc98e9a8120c2b4d3f1234"
 *                   match: { ... }
 *               WinnerByScore:
 *                 summary: Player won by highest score
 *                 value:
 *                   message: "Winner decided by score"
 *                   winner: "650b7d9a87f91345c1234567"
 *                   match: { ... }
 *               Draw:
 *                 summary: Match ended in a draw
 *                 value:
 *                   message: "Match ended in a draw"
 *                   winner: null
 *                   match: { ... }
 *       400:
 *         description: Invalid request (missing fields, cell already taken, or match already completed)
 *       403:
 *         description: Invalid move (not the player's turn or player not in the match)
 *       404:
 *         description: Match not found
 *       500:
 *         description: Internal server error
 */
router.post('/move', makeMove);

/**
 * @swagger
 * /api/v1/matches/{matchId}/join:
 *   post:
 *     summary: Join or start a match in a tournament
 *     description: |
 *       This endpoint allows an authenticated player to join a specific match in a tournament.  
 *       <br><br>
 *       Flow Overview:  
 *       - When a player joins, they are added to the joinedPlayers array in the match.  
 *       - If both players have joined, the match automatically transitions to "ongoing" status and starts immediately.  
 *       - If only one player joins and the opponent does not join within a 2-minute grace period, the player who joined first wins automatically ("auto-win").  
 *       - Automatic email notifications are sent to both players (and can be extended to hosts).  
 *       - All notifications are logged to the EmailLog collection for transparency.  
 *       
 *       Notifications include:  
 *       - 🎉 Auto-win notification (to the winner)  
 *       - 😔 Forfeit notification (to the loser)
 *       
 *       This system ensures fair play and tournament automation.
 *       
 *       Authorization:  
 *       Requires a valid JWT token (Bearer Auth).
 *     tags:
 *       - Matches
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the match to join.
 *     responses:
 *       200:
 *         description: Successfully joined or completed the match logic.
 *         content:
 *           application/json:
 *             examples:
 *               bothJoined:
 *                 summary: Both players joined, match started
 *                 value:
 *                   message: "Both players joined. Match started!"
 *                   matchId: "670f52e81df21e2c4b6a120c"
 *                   status: "ongoing"
 *               autoWin:
 *                 summary: Opponent didn’t show up — auto-win applied
 *                 value:
 *                   message: "Opponent didn’t show up. Auto-win applied."
 *                   winner: "670f52d91df21e2c4b6a11ff"
 *                   matchId: "670f52e81df21e2c4b6a120c"
 *                   status: "completed"
 *       202:
 *         description: Waiting for opponent to join.
 *         content:
 *           application/json:
 *             example:
 *               message: "Waiting for opponent to join..."
 *               matchId: "670f52e81df21e2c4b6a120c"
 *               joinedPlayers:
 *                 - "670f52d91df21e2c4b6a11ff"
 *               status: "pending"
 *       404:
 *         description: Match not found.
 *         content:
 *           application/json:
 *             example:
 *               message: "Match not found"
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal server error"
 */
router.post('/matches/:matchId/join', authMiddleware, matchController.joinMatch);



/**
 * @swagger
 * /api/v1/matches:
 *   get:
 *     summary: Get all matches
 *     description: >
 *       Retrieves all matches from the database.  
 *       Useful for admins or for viewing tournament progress.  
 *       Returns details like player IDs, board state, and status.
 *     tags: [Games]
  *     security: [] # No authentication required
 *     responses:
 *       200:
 *         description: List of matches
 *         content:
 *           application/json:
 *             example:
 *               - _id: "650a01c28f9b5678abcd1234"
 *                 player1: "64f9c23d8f9b1234abcd5678"
 *                 player2: "64f9c23d8f9b1234abcd5679"
 *                 status: "in-progress"
 *                 board: [["X","",""],["","O",""],["","",""]]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Failed to fetch matches"
 */
router.get('/matches',  matchController.getAllMatches);

/**
 * @swagger
 * /api/v1/matches/{matchId}:
 *   get:
 *     summary: Get a single match
 *     description: >
 *       Retrieves a specific match by its ID.  
 *       Includes full details such as current board, players, winner, and status.
 *     tags: [Games]
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Match ID
 *     responses:
 *       200:
 *         description: Match details
 *         content:
 *           application/json:
 *             example:
 *               _id: "650a01c28f9b5678abcd1234"
 *               player1: "64f9c23d8f9b1234abcd5678"
 *               player2: "64f9c23d8f9b1234abcd5679"
 *               status: "completed"
 *               winner: "64f9c23d8f9b1234abcd5678"
 *       404:
 *         description: Match not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Match not found"
 *       500:
 *         description: Server error
 */
router.get('/matches/:matchId',  matchController.getMatchById);

/**
 * @swagger
 * /api/v1/matches/{matchId}:
 *   delete:
 *     summary: Delete a match
 *     description: >
 *       Deletes a match by its ID.  
 *       Typically used for admin actions or clearing test matches.  
 *       Once deleted, the match cannot be recovered.
 *     tags: [Games]
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Match ID
 *     responses:
 *       200:
 *         description: Match deleted
 *         content:
 *           application/json:
 *             example:
 *               message: "Match deleted successfully"
 *       404:
 *         description: Match not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Match not found"
 *       500:
 *         description: Server error
 */
router.delete('/matches/:matchId',  matchController.deleteMatch);

module.exports = router;