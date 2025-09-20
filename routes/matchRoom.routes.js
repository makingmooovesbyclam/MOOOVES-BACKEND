const express = require('express');
const router = express.Router();
const controller = require('../controllers/matchRoom.controller');




/**
 * @swagger
 * /api/v1/match:
 *   post:
 *     summary: >
 *       Create a match room (Bluetooth/Hotspot pairing flow).  
 *       🔹 Backend does NOT handle the actual Bluetooth/Wi-Fi connection — the app does this using native APIs.  
 *       🔹 Backend only creates a room and generates a bluetoothToken that Player A shares with Player B.
 *     tags: [Match Room]
   *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "64f9c2e3a12bcd45ef567890"
 *               gameType:
 *                 type: string
 *                 example: "TicTacToe"
 *     responses:
 *       201:
 *         description: Match room created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Match room created"
 *               roomId: "650a6d123b7c11f7e09f45c9"
 *               room:
 *                 _id: "650a6d123b7c11f7e09f45c9"
 *                 user: "64f9c2e3a12bcd45ef567890"
 *                 gameType: "chess"
 *                 status: "waiting"
 *               bluetoothToken: "abc123xy"
  *       404:
 *         description: matchRoom not found
 *         content:
 *           application/json:
 *             example:
 *               message: "matchRoom not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal Server Error"
 */
router.post('/match', controller.createMatchRoom);

/**
 * @swagger
 * /api/v1/match/{roomId}:
 *   post:
 *     summary: >
 *       Join a match room (Bluetooth/Hotspot flow).  
 *       🔹 The mobile app must first connect devices via Bluetooth or hotspot.  
 *       🔹 Once Player B is connected locally and has the bluetoothToken, the app calls this API to register Player B in the backend.
 *     tags: [Match Room]
    *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the match room created by Player A
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "64f9c2e3a12bcd45ef567891"
 *               handshakeToken:
 *                 type: string
 *                 example: "abc123xy"
 *     responses:
 *       200:
 *         description: Player joined successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Player added successfully"
 *               room:
 *                 _id: "650a6d123b7c11f7e09f45c9"
 *                 player1: "64f9c2e3a12bcd45ef567890"
 *                 player2: "64f9c2e3a12bcd45ef567891"
 *                 gameType: "chess"
 *                 status: "paired"
 *       400:
 *         description: Error if user already joined or room is full
 *         content:
 *           application/json:
 *             example:
 *               error: "Room is already full"
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Room not found"
  *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal Server Error"
 */
router.post('/match/:roomId', controller.joinMatchRoom);
// router.post('/match/join/:inviteCode', controller.joinByInviteCode); // NEW

/**
 * @swagger
 * /api/v1/matchs:
 *   get:
 *     summary: Get all match rooms
 *     tags: [Match Room]
    *     security: [] # No authentication required
 *     responses:
 *       200:
 *         description: List of all match rooms
 *         content:
 *           application/json:
 *             example:
 *               message: "All match rooms"
 *               rooms:
 *                 - _id: "650a6d123b7c11f7e09f45c9"
 *                   gameType: "chess"
 *                   status: "waiting"
 *                   player1: { _id: "64f9...", username: "Alice" }
 *                   player2: null
  *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Room not found"
  *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal Server Error"
 */
router.get('/matchs', controller.getAllMatchRooms);

/**
 * @swagger
*   /api/v1/matchs/{roomId}:
 *   get:
 *     summary: Get one match room by ID
 *     tags: [Match Room]
     *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Match room details
 *         content:
 *           application/json:
 *             example:
 *               message: "Match room fetched"
 *               room:
 *                 _id: "650a6d123b7c11f7e09f45c9"
 *                 gameType: "chess"
 *                 status: "paired"
 *                 player1: { _id: "64f9...", username: "Alice" }
 *                 player2: { _id: "64f9...", username: "Bob" }
   *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Room not found"
  *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal Server Error"
 */
router.get('/matchs/:roomId', controller.getMatchRoom);


/**
 * @swagger
*  /api/v1/matchs/{roomId}:
*  delete:
 *     summary: Delete a match room
 *     tags: [Match Room]
      *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Match room deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Match room deleted successfully"
   *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Room not found"
  *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal Server Error"
 */
router.delete('/matchs/:roomId', controller.deleteMatchRoom);







 module.exports = router;