const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('Authentication required');
    }

    // Use the same secret fallback as registration/login
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    // Use userId from JWT payload
    const user = await User.findOne({ _id: decoded.userId })
      .populate('joinedRooms')
      .populate('contacts')
      .populate({
        path: 'privateChats.with',
        select: 'username avatar status lastSeen'
      });

    if (!user) {
      throw new Error('User not found');
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = auth;