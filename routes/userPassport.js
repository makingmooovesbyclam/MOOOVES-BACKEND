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

router.get('/auth/google/login', passport.authenticate('google',{failureRedirect:'login-failed'}),async(req,res)=>{
    console.log('Req User: ',req.user)
    const token = await jwt.sign({userId: req.user._id, isVerified: req.user.isVerified}, process.env.SECRET,{expiresIn:'1day'});
    res.status(200).json({
        message: 'Google Auth User Login Successful',
        data:req.user,
        token
    })
});

module.exports = router