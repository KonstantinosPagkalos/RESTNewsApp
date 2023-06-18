const jwt = require('jsonwebtoken');
require('dotenv').config();

const AdminOrReporter = (req, res, next) => {
  try {
    // Get the token from the request headers
    const token = req.headers.authorization.split(' ')[1];

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);

    console.log('Decoded Token:', decodedToken);

    // Check if the decoded token has the "admin" or "reporter" role
    if (decodedToken.role === 'admin' || decodedToken.role === 'reporter') {
      // Create a new JWT for the user
      const userToken = jwt.sign(
        {
          username: decodedToken.username,
          _id: decodedToken._id,
          role: decodedToken.role
        },
        process.env.JWT_KEY,
        { expiresIn: '1h' }
      );

      req.userToken = userToken; // Attach the user JWT to the request object
      console.log('User Token:', userToken);
      next(); // Proceed to the next middleware or route handler
    } else {
      console.log('Authorization failed');
      return res.status(401).json({ message: 'Authorization failed' });
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Token has expired
      return res.status(401).json({ message: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      // Invalid token
      return res.status(401).json({ message: 'Invalid token' });
    } else {
      // Other error
      console.log('Authentication failed:', err);
      return res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

module.exports = { AdminOrReporter };
