import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';
import redis from '../server.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req?.cookies?.authToken;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  const token = authHeader;

  try {
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false, 
        message: 'Token is no longer valid' 
      });
    }

    const decoded = await User.verifyAuthToken(token);    
    const user = await User.findById(decoded._id)

    if (!user) {
      return res.status(404).json({
        success: false, 
        message: 'User not found.' 
      });
    }

    req.user = user; 
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.' 
    });
  }
};

export default authMiddleware;