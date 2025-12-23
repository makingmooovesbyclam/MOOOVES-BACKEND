const express = require('express');
const router = express.Router();
const controller = require('../controllers/matchRoom.controller');


const {
  createMatchRoom,
  joinMatchByCode
} = require('../controllers/matchRoom.controller');


/**
 * @swagger
 * {
 *   "tags": [
 *     {
 *       "name": "Match Rooms",
 *       "description": "Temporary match rooms used to pair players via invite codes"
 *     }
 *   ]
 * }
 */

/**
 * @swagger
 * {
 *   "/api/v1/match-rooms": {
 *     "post": {
 *       "tags": ["Match Rooms"],
 *       "summary": "Create a match room",
 *       "description": "Creates a temporary match room and generates a 6-character invite code that can be shared with another player.",
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "example": {
 *               "userId": "64fa1111abcd2222ef333333",
 *               "gameType": "1v1"
 *             }
 *           }
 *         }
 *       },
 *       "responses": {
 *         "201": {
 *           "description": "Match room created successfully",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "message": "Match room created",
 *                 "roomId": "64faaaaaabcd9999ef000000",
 *                 "matchCode": "A9F2D1"
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "description": "Invalid request body",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "error": "userId is required"
 *               }
 *             }
 *           }
 *         },
 *         "500": {
 *           "description": "Server error",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "error": "Internal server error"
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
router.post('/match-rooms', createMatchRoom);




/**
 * @swagger
 * {
 *   "/api/v1/match-rooms/join": {
 *     "post": {
 *       "tags": ["Match Rooms"],
 *       "summary": "Join a match room using invite code",
 *       "description": "Allows a second player to join a match room using a 6-character invite code. Once two players join, the room is paired.",
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "example": {
 *               "matchCode": "A9F2D1",
 *               "userId": "64fa4444abcd5555ef666666"
 *             }
 *           }
 *         }
 *       },
 *       "responses": {
 *         "200": {
 *           "description": "Joined successfully",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "message": "Joined successfully",
 *                 "room": {
 *                   "_id": "64faaaaaabcd9999ef000000",
 *                   "player1": "64fa1111abcd2222ef333333",
 *                   "player2": "64fa4444abcd5555ef666666",
 *                   "status": "paired",
 *                   "inviteCode": "A9F2D1"
 *                 }
 *               }
 *             }
 *           }
 *         },
 *         "404": {
 *           "description": "Invalid invite code",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "error": "Invalid code"
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "description": "Room already full",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "error": "Room full"
 *               }
 *             }
 *           }
 *         },
 *         "500": {
 *           "description": "Server error",
 *           "content": {
 *             "application/json": {
 *               "example": {
 *                 "error": "Internal server error"
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
router.post('/match-rooms/join', joinMatchByCode);







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