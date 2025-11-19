// routes/tournament.routes.js
const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournanmentController');
const {authMiddleware}  = require('../middlewares/authMiddleware')
// ✅ Create tournament

/**
 * @swagger
 * /api/v1/tournaments:
 *   post:
 *     summary: Create a new tournament and generate a unique invite link
 *     description: |
 *       This endpoint allows a User or Host to create a new tournament.  
 *       
 *       ### 🧩 Logic Flow:
 *       - The organizer can be either a User or a Host.  
 *       - A User must have joined at least 2 tournaments before being allowed to host their own (unless already granted host rights).  
 *       - The system automatically validates maxPlayers, entryFee, and startTime.  
 *       - The maximum number of players allowed is 50.  
 *       - The startTime must be a valid future UTC date (ISO format).  
 *       - On success, the response includes a generated invite link (using a 4-byte random hex code).  
 *       - An optional email notification is sent to the organizer, confirming the tournament schedule.  
 *       
 *       Note:  
 *       - Default maxParticipants is 16 if not provided.  
 *       - Default entryFee is 0 if not provided.  
 *       - Automatically sets status to "scheduled".  
 *       - Auto-start is enabled by default (`autoStartEnabled: true`).
 *       
 *       Authorization: Requires Bearer Token (JWT)
 *     tags:
 *       - Tournaments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizerId
 *               - name
 *               - startTime
 *             properties:
 *               organizerId:
 *                 type: string
 *                 description: ID of the user or host creating the tournament
 *                 example: "670f52e81df21e2c4b6a120c"
 *               name:
 *                 type: string
 *                 description: The name of the tournament
 *                 example: "MOOOVES Pro League"
 *               maxPlayers:
 *                 type: integer
 *                 description: Maximum number of players allowed (must be ≤ 50)
 *                 example: 32
 *               entryFee:
 *                 type: number
 *                 description: Entry fee per participant
 *                 example: 500
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: UTC start time (ISO 8601 format)
 *                 example: "2025-11-01T15:00:00Z"
 *     responses:
 *       201:
 *         description: Tournament created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Tournament created successfully"
 *               tournament:
 *                 _id: "670f52e81df21e2c4b6a120c"
 *                 name: "MOOOVES Pro League"
 *                 createdBy: "670f52d91df21e2c4b6a11ff"
 *                 createdByModel: "Host"
 *                 participants: []
 *                 maxParticipants: 32
 *                 entryFee: 500
 *                 prizePool: 0
 *                 inviteCode: "a1b2c3d4"
 *                 status: "scheduled"
 *                 startTime: "2025-11-01T15:00:00.000Z"
 *                 autoStartEnabled: true
 *               inviteLink: "https://your-domain.com/api/v1/tournaments/join/a1b2c3d4"
 *       400:
 *         description: Missing or invalid input fields
 *         content:
 *           application/json:
 *             examples:
 *               missingFields:
 *                 summary: Missing organizerId or name
 *                 value:
 *                   error: "Host and name are required"
 *               invalidStartTime:
 *                 summary: Invalid or past start time
 *                 value:
 *                   error: "Invalid or past start time"
 *               maxPlayerExceeded:
 *                 summary: Too many players specified
 *                 value:
 *                   error: "maximum player is 50"
 *       403:
 *         description: User not eligible to host
 *         content:
 *           application/json:
 *             example:
 *               error: "You must join at least 2 tournaments before hosting one"
 *       404:
 *         description: Organizer not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Organizer not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Unexpected server error"
 */
router.post('/tournaments',authMiddleware, tournamentController.createTournament);

/**
 * @swagger
 * tags:
 *   - name: Internal Logic
 *     description: Non-endpoint business logic used internally by API controllers.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     StartTournamentLogic:
 *       type: object
 *       description: >
 *         Internal logic function responsible for initializing a tournament.  
 *         It is not exposed as a direct API endpoint, but called internally by /api/v1/tournaments/{id}/start.  
 *         Handles participant validation, match pairing, status updates, email notifications, and logging.
 *       properties:
 *         input:
 *           type: object
 *           properties:
 *             tournamentDoc:
 *               type: string
 *               description: >
 *                 Either a full Tournament document (with participants populated)  
 *                 or just a tournament ID (string).  
 *                 If only ID is provided, it fetches the document internally.
 *               example: "670f1b6d2c1a5e304bce9f8a"
 *         process:
 *           type: object
 *           description: Steps performed by the logic
 *           properties:
 *             1:
 *               type: string
 *               example: "Fetch full tournament document if only ID is provided."
 *             2:
 *               type: string
 *               example: "Validate min and max participants."
 *             3:
 *               type: string
 *               example: "Calculate prize pool based on entry fee × participant count."
 *             4:
 *               type: string
 *               example: "Randomly pair participants into matches (Round 1)."
 *             5:
 *               type: string
 *               example: "Create Match documents and link them to Round 1."
 *             6:
 *               type: string
 *               example: "Update tournament status to 'ongoing'."
 *             7:
 *               type: string
 *               example: "Send tournament-start emails to all participants."
 *             8:
 *               type: string
 *               example: "Send confirmation email to tournament creator (Host/User)."
 *             9:
 *               type: string
 *               example: "Log every email in EmailLog collection."
 *         output:
 *           type: object
 *           properties:
 *             matchIds:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["6710cbd512c1a5e304bce9a1", "6710cbd512c1a5e304bce9a2"]
 *             prizePool:
 *               type: number
 *               example: 2500
 *       example:
 *         input:
 *           tournamentDoc: "670f1b6d2c1a5e304bce9f8a"
 *         process:
 *           1: "Fetch tournament by ID"
 *           2: "Validate participants"
 *           3: "Pair players"
 *           4: "Create matches"
 *           5: "Send emails"
 *         output:
 *           matchIds: ["6710cbd512c1a5e304bce9a1", "6710cbd512c1a5e304bce9a2"]
 *           prizePool: 2500
 */


/**
 * @swagger
 * /api/v1/tournaments/{id}/reschedule:
 *   patch:
 *     summary: Reschedule a tournament (creator only)
 *     description: >
 *       Allows the tournament creator to change the start time of a scheduled tournament.  
 *       Only tournaments with a status of scheduled can be rescheduled.  
 *       The new start time must be a valid future date.  
 *       
 *       After successful update, all participants can optionally be notified via email or WhatsApp (if implemented).
 *     tags:
 *       - Tournaments
 *     security:
 *       - bearerAuth: []     # Requires JWT authentication via authMiddleware
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the tournament to reschedule.
 *         example: "6710a5e3b1d6c8f8a93b52a1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newStartTime
 *             properties:
 *               newStartTime:
 *                 type: string
 *                 format: date-time
 *                 description: The new start date and time for the tournament. Must be in the future.
 *                 example: "2025-11-10T14:30:00Z"
 *     responses:
 *       200:
 *         description: Tournament rescheduled successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tournament rescheduled"
 *                 startTime:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-11-10T14:30:00.000Z"
 *       400:
 *         description: Invalid new start time or tournament status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid new start time"
 *       403:
 *         description: Only the tournament creator can perform this action.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Only creator can reschedule"
 *       404:
 *         description: Tournament not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tournament not found"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unexpected error occurred"
 */
router.patch('/:id/reschedule', authMiddleware, tournamentController.rescheduleTournament); // reschedule (creator


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
 *     summary: Manually start a tournament
 *     description: |
 *       Starts a tournament when the creator decides to begin it.  
 *       This endpoint checks that:
 *       - The tournament exists  
 *       - The authenticated user is the creator  
 *       - The tournament status is "scheduled" or "pending"  
 *       - The minimum number of participants has joined  
 *       
 *       Once validated:
 *       - Players are randomly paired into matches for Round 1.  
 *       - Tournament status changes to "ongoing".  
 *       - All participants receive email notifications that the tournament has started.  
 *       - The creator (host/user) also receives a start confirmation email.  
 *       - Every sent email is logged in the EmailLog collection.  
 *       
 *       > ⚙️ You can also use ?force=true to override the minimum player requirement (for testing or host override).
 *     tags: [Tournaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique tournament ID to start.
 *         schema:
 *           type: string
 *         example: "670f1b6d2c1a5e304bce9f8a"
 *       - in: query
 *         name: force
 *         required: false
 *         description: Allows the creator to bypass minimum participant checks (use with caution).
 *         schema:
 *           type: boolean
 *           example: true
 *     responses:
 *       200:
 *         description: Tournament started successfully.
 *         content:
 *           application/json:
 *             example:
 *               message: "Tournament started successfully"
 *               tournamentId: "670f1b6d2c1a5e304bce9f8a"
 *       400:
 *         description: Invalid tournament state or permission error.
 *         content:
 *           application/json:
 *             examples:
 *               NotCreator:
 *                 summary: Unauthorized user
 *                 value:
 *                   message: "Only the creator can start this tournament"
 *               AlreadyStarted:
 *                 summary: Tournament already active
 *                 value:
 *                   message: "Tournament already started or completed"
 *               NotEnoughPlayers:
 *                 summary: Minimum player requirement not met
 *                 value:
 *                   message: "At least 4 participants required to start."
 *       404:
 *         description: Tournament not found.
 *         content:
 *           application/json:
 *             example:
 *               message: "Tournament not found"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             example:
 *               message: "Unexpected error occurred while starting tournament"
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