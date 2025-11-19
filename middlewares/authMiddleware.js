// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

  exports.authMiddleware =  (req, res, next) => {
  try {
   const token = req.headers.authorization?.split(" ")[1]

    console.log("token", token)

    // const token = authHeader.split(' ')[1];
    if(!token){
      return res.status(401).json({
        message: "Invalid token providedddddd"
      })
    }

    // ✅ Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded data to req.user
    req.user = {
      id: decoded.id,
      role: decoded.role || 'user', // fallback if no role
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

