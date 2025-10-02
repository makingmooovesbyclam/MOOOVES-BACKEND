// routes/tournament.routes.js
const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournanmentController');
const authMiddleware  = require('../middlewares/authMiddleware')
// ✅ Create tournament

/**
 * @swagger
 * /api/v1/tournaments:
 *   post:
 *     summary: Create a new tournament and generate an invite link
 *     description: >
 *       Creates a tournament (by host or user) and returns the tournament data plus a unique invite link.  
 *       Use this link to allow others to join.  
 *     tags: [Tournaments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, createdBy]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "strange"
 *               maxPlayers:
 *                 type: string
 *                 example: "25"
 *               entryfee:
 *                 type: Number
 *                 example: "500"
 *               organizerId:
 *                 type: string
 *                 description: ID of the user or host creating the tournament
 *                 example: "64f2b8d91a32f9c8b1c12345"
 *     responses:
 *       201:
 *         description: Tournament created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Tournament created"
 *               tournament:
 *                 id: "64f2b8d91a32f9c8b1c67890"
 *                 name: "Summer Championship"
 *                 inviteLink: "http://localhost:5000/api/v1/tournaments/join/abc123"
 *       400:
 *         description: Missing required fields or invalid data
 *         content:
 *           application/json:
 *             example:
 *               error: "Tournament name is required"
 *       500:
 *         description: Server error
 */
router.post('/tournaments',authMiddleware, tournamentController.createTournament);

// ✅ Join tournament using invite link
/**
 * @swagger
 * /api/v1/tournaments/join/{inviteCode}:
 *   post:
 *     summary: Join a tournament using an invite code
 *     description: >
 *       A player can join an existing tournament if they have the valid invite code.  
 *       Prevents duplicate joins.  
 *     tags: [Tournaments]
 *     parameters:
 *       - in: path
 *         name: inviteCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The invite code from the invite link
 *         example: abc123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "64f2c1a01a32f9c8b1c99999"
 *     responses:
 *       200:
 *         description: Player successfully joined the tournament
 *         content:
 *           application/json:
 *             example:
 *               message: "Player joined tournament"
 *       400:
 *         description: Invalid invite code or already joined
 *         content:
 *           application/json:
 *             examples:
 *               invalid:
 *                 summary: Invalid Code
 *                 value: { error: "Invalid invite code" }
 *               duplicate:
 *                 summary: Already Joined
 *                 value: { error: "Player already joined" }
 *       500:
 *         description: Server error
 */
router.post('/tournaments/join/:inviteCode',authMiddleware, tournamentController.joinTournamentWithLink);

// ✅ Get invite link for a specific tournament

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/invite:
 *   get:
 *     summary: Get the invite link for a tournament
 *     description: >
 *       Retrieves the stored invite link for a given tournament.  
 *       Useful if the frontend needs to re-display or share the link.  
 *     tags: [Tournaments]
   *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *         example: 64f2b8d91a32f9c8b1c67890
 *     responses:
 *       200:
 *         description: Invite link retrieved
 *         content:
 *           application/json:
 *             example:
 *               inviteLink: "http://localhost:5000/api/v1/tournaments/join/abc123"
 *       404:
 *         description: Tournament not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Tournament not found"
 *       500:
 *         description: Server error
 */
router.get('/tournaments/:tournamentId/invite', tournamentController.getInviteLink);

// ✅ Start a tournament
/**
 * @swagger
 * /api/v1/tournaments/{id}/start:
 *   post:
 *     summary: Start a tournament
 *     description: >
 *       Marks the tournament as started.  
 *       Can only be started once players have joined.  
 *     tags: [Tournaments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 64f2b8d91a32f9c8b1c67890
 *     responses:
 *       200:
 *         description: Tournament started successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Tournament started"
 *       400:
 *         description: Invalid request (already started, no players, etc.)
 *         content:
 *           application/json:
 *             example:
 *               error: "Tournament already started"
 *       404:
 *         description: Tournament not found
 *       500:
 *         description: Server error
 */
router.post('/tournaments/:id/start', authMiddleware,tournamentController.startTournament);

// ✅ Get all tournaments

/**
 * @swagger
 * /api/v1/tournaments:
 *   get:
 *     summary: Get all tournaments
 *     description: >
 *       Returns a list of all tournaments created in the system.  
 *       Useful for browsing or admin dashboards.  
 *     tags: [Tournaments]
*     security: [] # No authentication required
 *     responses:
 *       200:
 *         description: List of tournaments
 *         content:
 *           application/json:
 *             example:
 *               tournaments:
 *                 - id: "64f2b8d91a32f9c8b1c67890"
 *                   name: "Summer Championship"
 *                 - id: "64f2b8d91a32f9c8b1c54321"
 *                   name: "Winter Cup"
 *       500:
 *         description: Server error
 */
router.get('/tournaments', tournamentController.getAllTournaments);

// ✅ Get one tournament

/**
 * @swagger
 * /api/v1/tournaments/{id}:
 *   get:
 *     summary: Get details of a single tournament
 *     description: >
 *       Retrieves full information about one tournament (players, status, invite link, etc.).  
 *     tags: [Tournaments]
 *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 64f2b8d91a32f9c8b1c67890
 *     responses:
 *       200:
 *         description: Tournament details
 *         content:
 *           application/json:
 *             example:
 *               id: "64f2b8d91a32f9c8b1c67890"
 *               name: "Summer Championship"
 *               players: ["64f2c1a01a32f9c8b1c99999"]
 *       404:
 *         description: Tournament not found
 *       500:
 *         description: Server error
 */
router.get('/tournaments/:id', tournamentController.getTournamentById);


/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/winners:
 *   get:
 *     summary: Get winners of a completed tournament
 *     description: >
 *       Retrieves the first, second, and third place winners of a completed tournament.  
 *       This endpoint only works if the tournament has already ended.
 *     tags: [Tournaments]
 *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tournament
 *         example: "64f2b8d91a32f9c8b1c67890"
 *     responses:
 *       200:
 *         description: Tournament winners retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Tournament winners retrieved successfully"
 *               winners:
 *                 first: "64f2b8d91a32f9c8b1c11111"
 *                 second: "64f2b8d91a32f9c8b1c22222"
 *                 third: "64f2b8d91a32f9c8b1c33333"
 *       400:
 *         description: Tournament has not yet finished
 *         content:
 *           application/json:
 *             example:
 *               message: "Tournament is not yet completed. Winners will be available after the final round."
 *       404:
 *         description: Tournament not found
 *         content:
 *           application/json:
 *             example:
 *               message: "Tournament not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal server error: database connection failed"
 */
router.get(
  '/tournaments/:tournamentId/winners',
  authMiddleware,
  tournamentController.getTournamentWinners
);

// ✅ Delete tournament
/**
 * @swagger
 * /api/v1/tournaments/{id}:
*   delete:
 *     summary: Delete a tournament
 *     description: >
 *       Permanently deletes a tournament.  
 *       Only the creator should be allowed to delete.  
 *     tags: [Tournaments]
 *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 64f2b8d91a32f9c8b1c67890
 *     responses:
 *       200:
 *         description: Tournament deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Tournament deleted"
 *       403:
 *         description: Unauthorized (not creator)
 *         content:
 *           application/json:
 *             example:
 *               error: "Only the creator can delete this tournament"
 *       404:
 *         description: Tournament not found
 *       500:
 *         description: Server error
 */
router.delete('/tournaments/:id', tournamentController.deleteTournament);

module.exports = router;