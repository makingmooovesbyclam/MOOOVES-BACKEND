// routes/bankRoutes.js
const express = require('express');
const router = express.Router();
const transaction = require('../controllers/transaction');

// Get list of banks

/**
 * @swagger
 * /api/v1/banks:
 *   get:
 *     summary: Get list of Nigerian banks
 *     description: Fetches available Nigerian banks from Flutterwave for payouts and account linking.
 *     tags: [Payment]
   *     security: [] # No authentication required
 *     responses:
 *       200:
 *         description: List of Nigerian banks
 *         content:
 *           application/json:
 *             example:
 *               message: "Banks fetched successfully"
 *               banks:
 *                 - name: "Access Bank"
 *                   code: "044"
 *                 - name: "GTBank"
 *                   code: "058"
 *       500:
 *         description: Error fetching bank list
 *         content:
 *           application/json:
 *             example:
 *               message: "Error fetching bank list"
 */
router.get('/banks', transaction.getBanks);


/**
 * @swagger
 * /api/v1/banks/find:
 *   post:
 *     tags:
 *       - Banks
 *     summary: Find a Nigerian bank by name
 *     description: Search for banks in Nigeria using Flutterwave's bank list API. Provide a bank name in the request body to get its code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "OPay"
 *     responses:
 *       200:
 *         description: Bank(s) found
 *         content:
 *           application/json:
 *             examples:
 *               success:
 *                 summary: Bank found
 *                 value:
 *                   message: Bank(s) found
 *                   banks:
 *                     - name: "Opay Digital Services Limited (OPay)"
 *                       code: "999991"
 *       400:
 *         description: Missing required field
 *         content:
 *           application/json:
 *             examples:
 *               missingName:
 *                 summary: Name not provided
 *                 value:
 *                   message: "Bank name is required"
 *       404:
 *         description: Bank not found
 *         content:
 *           application/json:
 *             examples:
 *               notFound:
 *                 summary: Bank does not exist
 *                 value:
 *                   message: "No bank found matching \"XYZ\""
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             examples:
 *               flutterwaveError:
 *                 summary: Error fetching from Flutterwave
 *                 value:
 *                   message: "Error finding bank"
 */
router.post('/banks/find', transaction.findBanks);

/**
 * @swagger
 *  /api/v1/verify:
 *   get:
 *     summary: Verify a tournament payment
 *     description: Verifies a payment using Flutterwave transaction ID, updates tournament pool and transaction status.
 *     tags: [Payments]
    *     security: [] # No authentication required
 *     parameters:
 *       - in: query
 *         name: transaction_id
 *         schema:
 *           type: string
 *         required: true
 *         description: Flutterwave transaction ID to verify
 *         example: "3939393939"
 *     responses:
 *       200:
 *         description: Payment verified and tournament pool updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment verified & added to pool"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       example:
 *                         user: "650c2fffc9a2de0012e9d0c5"
 *                         tournament: "650c3f17c9a2de0012e9d0d1"
 *                         amount: 2000
 *                         status: "success"
 *                     cashPool:
 *                       type: number
 *                       example: 6000
 *       400:
 *         description: Payment not successful
 *         content:
 *           application/json:
 *             example:
 *               message: "Payment not successful"
 *               data:
 *                 status: "failed"
 *                 id: "3939393939"
 *       500:
 *         description: Server error while verifying payment
 *         content:
 *           application/json:
 *             example:
 *               message: "Error verifying payment"
 */
router.get('/verify', transaction.verifyPayment);

// Add or update bank details
/**
 * @swagger
 * /bank/add:
 *   post:
 *     summary: Add and save verified bank details for a user or host
 *     tags: [Bank]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountNumber
 *               - bankCode
 *               - role
 *               - userId
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 example: "1234567890"
 *               bankCode:
 *                 type: string
 *                 example: "058"  # GTBank
 *               role:
 *                 type: string
 *                 enum: [host, user]
 *                 example: "user"
 *               userId:
 *                 type: string
 *                 description: MongoDB ObjectId of the user/host
 *                 example: "64f0c0e4d5b87a1234567890"
 *     responses:
 *       200:
 *         description: Bank details saved successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Bank details saved successfully"
 *               accountName: "Jane Doe"
 *       400:
 *         description: Invalid account details
 *         content:
 *           application/json:
 *             example:
 *               message: "Invalid account details"
 *       500:
 *         description: Error saving bank details
 *         content:
 *           application/json:
 *             example:
 *               message: "Error adding bank details"
 */
router.post('/bank/add', transaction.addBankDetails);


/**
 * @swagger
 * /api/v1/initial:
 *   post:
 *     summary: Initialize tournament payment
 *     description: Starts a Flutterwave payment for a tournament entry fee. Ensures tournament capacity, valid fee, and prevents duplicate payments.
 *     tags: [Payment]
   *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - tournamentId
 *               - userId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "player@example.com"
 *               tournamentId:
 *                 type: string
 *                 description: Tournament ID (Mongo ObjectId)
 *                 example: "650c3f17c9a2de0012e9d0d1"
 *               userId:
 *                 type: string
 *                 description: User ID (Mongo ObjectId)
 *                 example: "650c2fffc9a2de0012e9d0c5"
 *     responses:
 *       201:
 *         description: Payment initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment initialized"
 *                 payment_link:
 *                   type: string
 *                   example: "https://checkout.flutterwave.com/link/abc123"
 *       400:
 *         description: Validation error (duplicate payment, tournament full, invalid fee)
 *         content:
 *           application/json:
 *             examples:
 *               TournamentNotFound:
 *                 value:
 *                   message: "Tournament not found"
 *               TournamentFull:
 *                 value:
 *                   message: "Tournament is full (max 50 players)"
 *               InvalidFee:
 *                 value:
 *                   message: "Invalid entry fee"
 *               DuplicatePayment:
 *                 value:
 *                   message: "You already paid for this tournament"
 *       500:
 *         description: Server error while initializing payment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error initializing payment"
 */
router.post('/initial', transaction.initialPayment);



/**
 * @swagger
 * /api/v1/payouts/distribute/{tournamentId}:
 *   post:
 *     summary: Distribute payouts for a tournament
 *     description: Distributes prize pool among host, winners (1st, 2nd, 3rd), and platform. Requires winners in body.
 *     tags: [Payment]
   *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tournament ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - winners
 *             properties:
 *               winners:
 *                 type: object
 *                 properties:
 *                   first:
 *                     type: string
 *                     description: User ID of 1st place winner
 *                     example: "64fbc23eac1234abcd567890"
 *                   second:
 *                     type: string
 *                     description: User ID of 2nd place winner
 *                   third:
 *                     type: string
 *                     description: User ID of 3rd place winner
 *     responses:
 *       200:
 *         description: Payout distribution completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payout distribution completed"
 *       400:
 *         description: Invalid request or missing data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Tournament not found"
 *       500:
 *         description: Internal server error during payout distribution
 */
router.post(
  '/distribute/:tournamentId',
  transaction.distributePayment
);


/**
 * @swagger
 * /api/v1/payouts/send:
 *   post:
 *     summary: Send a manual payout
 *     description: Directly send money to a bank account via Flutterwave.
 *     tags: [Payment]
   *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountBank
 *               - accountNumber
 *               - amount
 *             properties:
 *               accountBank:
 *                 type: string
 *                 description: Bank code (e.g., "044" for Access Bank)
 *                 example: "044"
 *               accountNumber:
 *                 type: string
 *                 description: Recipient bank account number
 *                 example: "0123456789"
 *               amount:
 *                 type: number
 *                 description: Amount to send
 *                 example: 5000
 *               narration:
 *                 type: string
 *                 description: Payment description
 *                 example: "Tournament payout"
 *     responses:
 *       200:
 *         description: Payout initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payout initiated"
 *                 data:
 *                   type: object
 *                   description: Flutterwave API response
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Payout transfer failed
 */
router.post(
  '/send',    
  transaction.sendPayout
);

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     summary: Handle Flutterwave webhook events
 *     description: Receives and processes webhook events from Flutterwave (payments and transfers).
 *     tags: [Payment]
 *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               event: "charge.completed"
 *               data:
 *                 tx_ref: "tournament_650c3f17_1696019200"
 *                 amount: 2000
 *                 status: "successful"
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Webhook processed"
 *       400:
 *         description: Invalid signature
 *         content:
 *           application/json:
 *             example:
 *               message: "Invalid signature"
 *       500:
 *         description: Server error while handling webhook
 *         content:
 *           application/json:
 *             example:
 *               message: "Webhook processing failed"
 */
router.post("/webhook", transaction.handleWebhook);

/**
 * @swagger
 * /api/v1/bank/verify:
 *   post:
 *     summary: Verify a bank account number and bank code
 *     tags: [Payment]
  *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_number
 *               - bank_code
 *             properties:
 *               account_number:
 *                 type: string
 *                 example: "1234567890"
 *               bank_code:
 *                 type: string
 *                 example: "044"  # Access Bank
 *     responses:
 *       200:
 *         description: Account verified successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Account verified successfully"
 *               account_name: "John Doe"
 *               account_number: "1234567890"
 *               bank_code: "044"
 *       400:
 *         description: Invalid account details or missing parameters
 *         content:
 *           application/json:
 *             example:
 *               message: "Invalid account details"
 *               error: "Bank code or account number is incorrect"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Error verifying account"
 */
router.post("/bank/verify", transaction.verifyAccount);

/**
 * @swagger
 * /api/v1/company-bank/register:
 *   post:
 *     summary: Register or update company bank account
*     tags: [Payment]
  *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_number
 *               - bank_code
 *               - account_name
 *             properties:
 *               account_number:
 *                 type: string
 *                 example: "1234567890"
 *               bank_code:
 *                 type: string
 *                 example: "044"
 *               account_name:
 *                 type: string
 *                 example: "Moooves Technologies Ltd"
 *     responses:
 *       201:
 *         description: Company bank registered successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Company bank registered successfully"
 *               data:
 *                 _id: "64f1a9a3c7b9f12345678901"
 *                 account_number: "1234567890"
 *                 bank_code: "044"
 *                 account_name: "Moooves Technologies Ltd"
 *                 recipientCode: "RCP_ABC123456789"
 *                 createdAt: "2025-09-29T15:22:11.123Z"
 *       400:
 *         description: Failed to create beneficiary on Flutterwave
 *         content:
 *           application/json:
 *             example:
 *               message: "Failed to create beneficiary"
 *               data:
 *                 status: "error"
 *                 message: "Invalid bank account"
 *       500:
 *         description: Internal server error while registering
 *         content:
 *           application/json:
 *             example:
 *               message: "Error registering company bank"
 *               error: "FLW API timeout"
 */
router.post("/company-bank/register", transaction.registerCompanyBank);

/**
 * @swagger
 * /api/v1/transactions/{tournamentId}:
 *   get:
 *     summary: Get all transactions for a tournament
*     tags: [Payment]
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         schema:
 *           type: string
 *         required: true
 *         description: Tournament ID
 *         example: "65123abcd456ef7890123456"
 *     responses:
 *       200:
 *         description: Transactions fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Transactions fetched successfully"
 *               count: 2
 *               transactions:
 *                 - _id: "652345abcdef1234567890"
 *                   user: { _id: "60123abc456def78901234", username: "john_doe", email: "john@example.com" }
 *                   tournament: "65123abcd456ef7890123456"
 *                   amount: 1000
 *                   status: "success"
 *                   createdAt: "2025-09-29T14:22:11.123Z"
 *                 - _id: "652345abcdef1234567891"
 *                   user: { _id: "60123abc456def78901235", username: "jane_doe", email: "jane@example.com" }
 *                   tournament: "65123abcd456ef7890123456"
 *                   amount: 1000
 *                   status: "pending"
 *                   createdAt: "2025-09-29T14:23:11.123Z"
 *       404:
 *         description: No transactions found
 *         content:
 *           application/json:
 *             example:
 *               message: "No transactions found for this tournament"
 *       500:
 *         description: Server error fetching transactions
 *         content:
 *           application/json:
 *             example:
 *               message: "Error fetching transactions"
 */
router.get("/tournament/:tournamentId", transaction.getTournamentTransactions);
module.exports = router;

