const express = require('express');
const {registers} = require('../middlewares/validator')
const {
  createHost,
  getHosts,
  getOneHost,
  updateHost,
  deleteHost,
  Hostlogin
} = require('../controllers/host.controller');
const jwt = require('jsonwebtoken');
const passport = require('passport')
const router = express.Router();


/**
 * @swagger
 * /api/v1/host:
 *   post:
 *     summary: Create a new host account
 *     description: Registers a new host in the system after validating inputs and ensuring uniqueness of email and full name.
 *     tags:
 *       - Host
  *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - repeatPassword
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 3
 *                 pattern: "^[A-Za-z ]+$"
 *                 description: Full name must contain only alphabets and spaces, at least 3 characters.
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Must be a valid email format.
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*\\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$"
 *                 description: Password must be at least 8 characters long, contain one uppercase, one lowercase, one number, and one special character (!@#$%^&*).
 *                 example: StrongPassword@123
 *               repeatPassword:
 *                 type: string
 *                 description: Must match the password.
 *                 example: StrongPassword@123
 *           examples:
 *             ValidRequest:
 *               summary: Correct input
 *               value:
 *                 fullName: John Doe
 *                 email: johndoe@example.com
 *                 password: StrongPassword@123
 *                 repeatPassword: StrongPassword@123
 *             InvalidName:
 *               summary: Name contains numbers
 *               value:
 *                 fullName: John123
 *                 email: johndoe@example.com
 *                 password: StrongPassword@123
 *                 repeatPassword: StrongPassword@123
 *             InvalidPassword:
 *               summary: Password missing special character
 *               value:
 *                 fullName: John Doe
 *                 email: johndoe@example.com
 *                 password: StrongPassword123
 *                 repeatPassword: StrongPassword123
 *     responses:
 *       201:
 *         description: Host created successfully.
 *         content:
 *           application/json:
 *             example:
 *               message: Host created successfully.
 *               host:
 *                 _id: 64b8aef5f1e3b2d5c3a12345
 *                 fullName: John Doe
 *                 email: johndoe@example.com
 *       400:
 *         description: Validation error or email already in use.
 *         content:
 *           application/json:
 *             examples:
 *               MissingFields:
 *                 summary: Missing required fields
 *                 value:
 *                   error: Please provide fullName, email, password, and repeatPassword
 *               PasswordMismatch:
 *                 summary: Passwords do not match
 *                 value:
 *                   message: Passwords do not match
 *               EmailInUse:
 *                 summary: Email already in use
 *                 value:
 *                   message: "Email: johndoe@example.com is already in use"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 *               details: "Database connection failed"
 */
router.post('/host', registers, createHost);



/**
 * @swagger
 * /api/v1/hostlogin:
 *   post:
 *     summary: Host login
 *     description: Authenticates a host using email and password, and returns a JWT token.
 *     tags:
 *       - Host 
  *     security: [] # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: host@example.com
 *               password:
 *                 type: string
 *                 example: myStrongPassword123
 *     responses:
 *       200:
 *         description: Host login successful
 *         content:
 *           application/json:
 *             example:
 *               message: "Host Login successful"
 *               data:
 *                 _id: "64b0f3f1f2e45a1234567890"
 *                 name: "John Doe"
 *                 email: "host@example.com"
 *                 createdAt: "2025-08-12T12:34:56.789Z"
 *                 updatedAt: "2025-08-12T12:34:56.789Z"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Missing fields or invalid credentials
 *         content:
 *           application/json:
 *             example:
 *               message: "Invalid Password"
 *       404:
 *         description: Host not found
 *         content:
 *           application/json:
 *             example:
 *               message: "Host not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal Server Error"
 */
router.post('/hostlogin', Hostlogin);


/**
 * @swagger
 * /api/v1/host:
 *   get:
 *     summary: Retrieve all hosts
 *     description: Fetches a list of all hosts from the database.
 *     tags:
 *       - Host
  *     security: [] # No authentication required
 *     responses:
 *       200:
 *         description: Hosts retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               message: host retrived successfully
 *               hosts:
 *                 - _id: "64f1a2b3c4d5e6f7890a1b2c"
 *                   name: "John Doe"
 *                   email: "johndoe@example.com"
 *                 - _id: "64f1a2b3c4d5e6f7890a1b2d"
 *                   name: "Jane Smith"
 *                   email: "janesmith@example.com"
 *       500:
 *         description: Failed to fetch hosts
 *         content:
 *           application/json:
 *             example:
 *               error: Failed to fetch hosts
 */
router.get('/host', getHosts);


/**
 * @swagger
 * /api/v1/host/{id}:
 *   get:
 *     summary: Get a host by ID
 *     description: Fetches a specific host from the database using its unique ID.
 *     tags:
 *       - Host
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique MongoDB ObjectId of the host.
 *         schema:
 *           type: string
 *           example: 64f1a2b3c4d5e6f7890a1b2c
 *     responses:
 *       200:
 *         description: Host retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               _id: "64f1a2b3c4d5e6f7890a1b2c"
 *               name: "John Doe"
 *               email: "johndoe@example.com"
 *               phone: "+2348012345678"
 *               createdAt: "2025-08-01T12:00:00.000Z"
 *               updatedAt: "2025-08-05T15:30:00.000Z"
 *       404:
 *         description: Host not found
 *         content:
 *           application/json:
 *             example:
 *               error: Host not found
 *       400:
 *         description: Invalid host ID format
 *         content:
 *           application/json:
 *             example:
 *               error: Invalid host ID
 */
router.get('/host/:id', getOneHost);



/**
 * @swagger
 * /api/v1/host/{id}:
 *   put:
 *     summary: Update an existing host
 *     description: Update the fullName and/or email of a host by their ID.
 *     tags:
 *       - Host
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the host to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Michael Johnson"
 *               email:
 *                 type: string
 *                 example: "michael.johnson@example.com"
 *           example:
 *             fullName: "Michael Johnson"
 *             email: "michael.johnson@example.com"
 *     responses:
 *       200:
 *         description: Host successfully updated.
 *         content:
 *           application/json:
 *             example:
 *               message: "Host updated"
 *               host:
 *                 _id: "66b9055a582f53e6d8b12345"
 *                 fullName: "Michael Johnson"
 *                 email: "michael.johnson@example.com"
 *                 createdAt: "2025-08-12T09:00:00.000Z"
 *                 updatedAt: "2025-08-12T09:10:00.000Z"
 *       400:
 *         description: Bad request (nothing to update or invalid data).
 *         content:
 *           application/json:
 *             example:
 *               error: "Nothing to update"
 *       404:
 *         description: Host not found.
 *         content:
 *           application/json:
 *             example:
 *               error: "Host not found"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             example:
 *               error: "Something went wrong"
 *               details: "Error details here"
 */
router.put('/host/:id', updateHost);




/**
 * @swagger
 * /api/v1/host/{id}:
 *   delete:
 *     summary: Delete a host
 *     description: Permanently removes a host from the database by their unique ID.
 *     tags:
 *       - Host
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique ID of the host to delete.
 *         schema:
 *           type: string
 *           example: 64e13d7a2c3f4b0021f6b8c1
 *     responses:
 *       200:
 *         description: Host successfully deleted
 *         content:
 *           application/json:
 *             example:
 *               message: Host deleted
 *       404:
 *         description: Host not found
 *         content:
 *           application/json:
 *             example:
 *               error: Host not found
 *       400:
 *         description: Invalid host ID
 *         content:
 *           application/json:
 *             example:
 *               error: Invalid host ID
 */
router.delete('/host/:id', deleteHost);



/**
 * @swagger
 * /api/v1/google-autheticate:
 *   get:
 *     summary: Authenticate a Host with Google
 *     description: Redirects the user to Google for authentication using OAuth.
*     tags:
 *       - Host
 *     security: [] # No authentication needed before redirecting to Google
 *     responses:
 *       302:
 *         description: Redirects to Google for authentication
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get('/host-google-autheticate', passport.authenticate('google-host',{scope: ['profile','email']}));
console.log(passport._strategies)

/**
 * @swagger
 * /api/v1/auth/google/login:
 *   get:
 *     summary: Login a user using Google OAuth
 *     description: Authenticates a user via Google and returns a JWT token upon successful login.
*     tags:
 *       - Host
 *     security: [] # No Authentication Required
 *     responses:
 *       200:
 *         description: Google authentication successful, JWT token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "GoogleAuth Login Successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: User ID
 *                       example: "605c72b1f1a3c619946b57da"
 *                     fullName:
 *                       type: string
 *                       description: User's full name
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: User's email address
 *                       example: "johndoe@example.com"
 *                     isVerified:
 *                       type: boolean
 *                       description: Whether the user's email is verified
 *                       example: true
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Bad Request - Google authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Google authentication failed"
 *       401:
 *         description: Unauthorized - Token not provided or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Access denied, token must be provided"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */

router.get('/api/v1/host/auth/google/login', passport.authenticate('google-host',{failureRedirect:'login-failed'}),async(req,res)=>{
    console.log('Req User: ',req.user)
    console.log('Google redirecting back to :',req.originalUrl)
    const token = await jwt.sign({userId: req.user._id, isVerified: req.user.isVerified}, process.env.SECRET,{expiresIn:'1day'});
    res.status(200).json({
        message: 'Google Auth Host Login Successful',
        data:req.user,
        token
    })
});

module.exports = router;