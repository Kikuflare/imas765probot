const apiSecret = process.env.API_SECRET;

module.exports = role => {
  return((req, res, next) => {
    const authorization = req.get('Authorization');
    
    if (!authorization) {
      res.status(400);
      return res.end();
    }
    
    if (!authorization.startsWith("Bearer ")) {
      res.status(400);
      return res.end();
    }
    
    const token = authorization.replace('Bearer ', '');
   
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, apiSecret);

      if (decoded.role !== role) {
        res.status(403);
        return res.end();
      }
    }
    catch(err) {
      // Token is invalid. Do not allow any further action.
      res.status(403);
      return res.end();
    }
    
    next();
  })
}