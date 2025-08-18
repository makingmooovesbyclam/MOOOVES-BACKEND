const { register, verifyUser, login,getUsers,getoneUser,updateUser,deleteUser } = require('../controllers/usercontroller');
const {registers} = require('../middlewares/validator')
const jwt = require('jsonwebtoken');
const passport = require('passport')
const router = require('express').Router();



/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Register a new user
 *     tags: 
 *       - Users
  *     security: [] # No authentication required
 *     description: Creates a new user account after validating input fields, ensuring unique email and username, and matching passwords.
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
 *                 description: Full name must be at least 3 characters long and contain only alphabets and spaces.
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Must be a valid email address.
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*\\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$"
 *                 description: Password must be at least 8 characters long, contain one uppercase, one lowercase, one number, and one special character (!@#$%^&*).
 *                 example: "StrongPass123!"
 *               repeatPassword:
 *                 type: string
 *                 description: Must match the password exactly.
 *                 example: "StrongPass123!"
 *           examples:
 *             ValidRequest:
 *               summary: Correct input
 *               value:
 *                 fullName: "John Doe"
 *                 email: "john.doe@example.com"
 *                 password: "StrongPass123!"
 *                 repeatPassword: "StrongPass123!"
 *             InvalidName:
 *               summary: Name with numbers
 *               value:
 *                 fullName: "John123"
 *                 email: "john.doe@example.com"
 *                 password: "StrongPass123!"
 *                 repeatPassword: "StrongPass123!"
 *             InvalidPassword:
 *               summary: Missing special character
 *               value:
 *                 fullName: "John Doe"
 *                 email: "john.doe@example.com"
 *                 password: "StrongPass123"
 *                 repeatPassword: "StrongPass123"
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "User registered successfully. Please check your email to verify your account."
 *               data:
 *                 _id: "64f0b67f8c1b2a6d3c45e789"
 *                 fullName: "John Doe"
 *                 email: "john.doe@example.com"
 *                 password: "$2b$10$hashedPasswordExample"
 *                 createdAt: "2025-08-12T10:15:30.000Z"
 *                 updatedAt: "2025-08-12T10:15:30.000Z"
 *       400:
 *         description: Validation error or duplicate record
 *         content:
 *           application/json:
 *             examples:
 *               MissingFields:
 *                 summary: Required fields missing
 *                 value:
 *                   message: "Please provide fullName, email, password, and repeatPassword"
 *               PasswordMismatch:
 *                 summary: Passwords do not match
 *                 value:
 *                   message: "Passwords do not match"
 *               EmailInUse:
 *                 summary: Email already exists
 *                 value:
 *                   message: "Email: john.doe@example.com already in use"
 *               NameInUse:
 *                 summary: Name already exists
 *                 value:
 *                   message: "Name: John Doe already in use"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal Server Error"
 */
router.post('/users', registers, register);

// router.get('/verify-user/:token', verifyUser);

/**
 * @swagger
 * /api/v1/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user using email and password and returns a JWT token on success.
 *     tags:
 *       - Users
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
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Password123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   example:
 *                     _id: "64a3b1d1f9a1b2c3d4e5f678"
 *                     email: "john.doe@example.com"
 *                     name: "John Doe"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Missing email/password or invalid password
 *         content:
 *           application/json:
 *             example:
 *               message: "please enter email and password"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             example:
 *               message: "User not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               message: "Internal Server Error"
 */
router.post('/login', login);


/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Retrieve a list of all users
 *     description: Fetches all users from the database.
 *     tags:
 *       - Users
  *     security: [] # No authentication required
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "64d234ab1234567890abcdef"
 *                   name:
 *                     type: string
 *                     example: "John Doe"
 *                   email:
 *                     type: string
 *                     example: "john.doe@example.com"
 *                   role:
 *                     type: string
 *                     example: "user"
 *             example:
 *               - _id: "64d234ab1234567890abcdef"
 *                 name: "John Doe"
 *                 email: "john.doe@example.com"
 *                 role: "user"
 *               - _id: "64d234ab1234567890abcdea"
 *                 name: "Jane Smith"
 *                 email: "jane.smith@example.com"
 *                 role: "admin"
 *       500:
 *         description: Failed to fetch users
 *         content:
 *           application/json:
 *             example:
 *               error: "Failed to fetch users"
 */
router.get('/users', getUsers);


/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Retrieves a single user based on their unique MongoDB ObjectID.
 *     tags:
 *       - Users
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB ObjectID of the user to retrieve
 *         schema:
 *           type: string
 *           example: 64d7f15be4b0c4d8b2a9f6b1
 *     responses:
 *       200:
 *         description: Successfully retrieved the user
 *         content:
 *           application/json:
 *             example:
 *               _id: 64d7f15be4b0c4d8b2a9f6b1
 *               name: John Doe
 *               email: johndoe@example.com
 *               role: user
 *               createdAt: 2025-08-01T12:34:56.789Z
 *               updatedAt: 2025-08-01T12:34:56.789Z
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             example:
 *               error: User not found
 *       400:
 *         description: Invalid user ID format
 *         content:
 *           application/json:
 *             example:
 *               error: Invalid user ID
 */
router.get('/users/:id', getoneUser);


/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update a user's information
 *     description: Updates the specified user's fullName and/or email. If both fields are missing in the request body, it will return a 400 error.
 *     tags:
 *       - Users
  *     security: [] # No authentication required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user to update
 *         schema:
 *           type: string
 *           example: 64df0f9c5d1b6c1f8e2b1234
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *             example:
 *               fullName: Jane Doe
 *               email: janedoe@example.com
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: 64df0f9c5d1b6c1f8e2b1234
 *                 fullName:
 *                   type: string
 *                   example: Jane Doe
 *                 email:
 *                   type: string
 *                   example: janedoe@example.com
 *       400:
 *         description: No fields provided to update
 *         content:
 *           application/json:
 *             example:
 *               error: "Nothing to update"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Failed to update user"
 */
router.put('/users/:id', updateUser);


/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     description: Permanently removes a user from the system using their unique ID.
 *     tags:
 *       - Users
  *     security: [] # No authentication required
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the user to delete.
 *         required: true
 *         schema:
 *           type: string
 *           example: 64b8aef5f1e3b2d5c3a12345
 *     responses:
 *       200:
 *         description: User successfully deleted.
 *         content:
 *           application/json:
 *             example:
 *               message: User deleted
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             example:
 *               error: User not found
 *       400:
 *         description: Invalid user ID.
 *         content:
 *           application/json:
 *             example:
 *               error: Invalid user ID
 */
router.delete('/users/:id', deleteUser);

/**
 * @swagger
 * /google-autheticate:
 *   get:
 *     summary: Authenticate a user with Google
 *     description: Redirects the user to Google for authentication using OAuth.
 *     tags:
 *       - Google Authentication 
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
router.get('/google-autheticate', passport.authenticate('google',{scope: ['profile','email']}));


/**
 * @swagger
 * /auth/google/login:
 *   get:
 *     summary: Login a user using Google OAuth
 *     description: Authenticates a user via Google and returns a JWT token upon successful login.
 *     tags:
 *       - Google Authentication
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

router.get('/auth/google/login', passport.authenticate('google'),async(req,res)=>{
    console.log('Req User: ',req.user)
    const token = await jwt.sign({userId: req.user._id, isVerified: req.user.isVerified}, process.env.SECRET,{expiresIn:'1day'});
    res.status(200).json({
        message: 'Google Auth Login Successful',
        data:req.user,
        token
    })
});

module.exports = router