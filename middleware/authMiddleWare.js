import jwt from 'jsonwebtoken';
import User from '../models/User';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = User.verifyAuthToken(token);
    
    // 3. Find the user based on the payload ID and attach them to the request object
    const user = await User.findById(decoded._id).select('-password'); // Exclude password for security
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    req.user = user; // Attach the user document to req.user for use in next routes
    next(); // Pass control to the next route handler
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired token.' });
  }
};

export default authMiddleware;