const express = require('express');
const router = express.Router();
const { makeMove ,createMatch} = require('../controllers/gameController');

const matchController = require('../controllers/gameController');



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
 *     summary: Make a move in a live match
 *     description: >
 *       Allows a player to make a move during a game (e.g., TicTacToe, Chess, etc.).  
 *       Logic:  
 *       - Validates that it's the player's turn.  
 *       - Updates the board state in the Match model.  
 *       - Checks for a win, loss, or draw after the move.  
 *       - If game ends, winner is assigned, and tournament progression continues.  
 *
 *       Why important? This enables the actual gameplay, ensuring fairness and win/draw detection.
 *     tags: [Games]
  *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               matchId:
 *                 type: string
 *               playerId:
 *                 type: string
 *               move:
 *                 type: object
 *                 description: Move payload depending on game type
 *             example:
 *               matchId: "64f9c23d8f9b1234abcd5678"
 *               playerId: "64f9c23d8f9b1234abcd5678"
 *               move:
 *                 x: 1
 *                 y: 2
 *     responses:
 *       200:
 *         description: Move accepted
 *         content:
 *           application/json:
 *             example:
 *               board: [["X","",""],["","O",""],["","",""]]
 *               nextTurn: "64f9c23d8f9b1234abcd5679"
 *               status: "in-progress"
 *       400:
 *         description: Invalid move (e.g., cell occupied or not player's turn)
 *         content:
 *           application/json:
 *             example:
 *               error: "Invalid move"
 *       404:
 *         description: Match not found
   *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Failed "
 */
router.post('/move', makeMove);

/**
 * @swagger
 * /api/v1/moves:
 *   post:
 *     summary: Create a new match for offline 1v1
 *     description: >
 *       Initializes a new match object in the database.  
 *       This is usually triggered when pairing players in the first round or subsequent rounds.  
 *       The system assigns player1 and player2, sets the board to default state, and status to in-progress.
 *     tags: [Games]
  *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               player1:
 *                 type: string
 *               player2:
 *                 type: string
 *             example:
 *               player1: "64f9c23d8f9b1234abcd5678"
 *               player2: "64f9c23d8f9b1234abcd5679"
 *     responses:
 *       201:
 *         description: Match created successfully
 *         content:
 *           application/json:
 *             example:
 *               matchId: "650a01c28f9b5678abcd1234"
 *               player1: "64f9c23d8f9b1234abcd5678"
 *               player2: "64f9c23d8f9b1234abcd5679"
 *               status: "in-progress"
 *       400:
 *         description: Invalid input
   *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Failed "
 */
router.post('/moves', createMatch);

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