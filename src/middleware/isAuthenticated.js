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

      if (role && decoded.role !== role) {
        res.status(403);
        return res.end();
      }
      
      res.locals.user = decoded.sub ? decoded.sub : null;
      res.locals.role = decoded.role ? decoded.role : null;
      res.locals.id = decoded.id ? decoded.id : null;
    }
    catch (err) {
      // Token is invalid. Do not allow any further action.
      res.status(403);
      return res.end();
    }
    
    next();
  })
}