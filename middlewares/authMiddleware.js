// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

 const authMiddleware =  (req, res, next) => {
  try {
   const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

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

module.exports = authMiddleware