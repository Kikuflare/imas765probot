const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');
const apiSecret = process.env.API_SECRET;


function AuthenticationRouteHandler(pool) {
  this.pool = pool;
  
  // Grants the user a JWT if credentials are valid
  this.login = (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    
    if (!username || !password) {
      res.status(400);
      return res.end();
    }
    
    const usernameLowercase = username.toLowerCase();
    const statement = "SELECT password, role FROM app_user WHERE username = $1 LIMIT 1";
    const data = [usernameLowercase];
    
    return this.pool.query(statement, data)
      .then(result => {
        const rowCount = result.rowCount;
      
        // User with the provided username does not exist
        if (rowCount < 1) {
          res.status(401);
          return res.end();
        }
        else {
          const role = result.rows[0].role;
          const passwordHash = result.rows[0].password;
          const isPasswordValid = bcrypt.compareSync(password, passwordHash);
          
          if (isPasswordValid) {
            const claim = {
              sub: usernameLowercase,
              role: role
            }

            const token = jwt.sign(claim, apiSecret, { expiresIn: '1h' });
            
            res.status(200);
            return res.send(token);
          }
          else {
            res.status(401);
            return res.end();
          }
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500);
        return res.end();
      });
  };
  
  
  // Register a new user (without admin privileges)
  this.register = (req, res) => {
    // screenname is how the username will be displayed
    // username is the lowercased string of screenname
    const screenname = req.body.username;
    const password = req.body.password;
    
    if (!screenname || !password) {
      // Screenname or password is not valid, so return 400 Bad Request.
      res.status(400);
      return res.end();
    }
    
    const username = screenname.toLowerCase();
    
    // Check if the username already exists
    const existsStatement = "SELECT EXISTS (SELECT 1 FROM app_user WHERE username=$1 LIMIT 1);"
    
    return this.pool.query(existsStatement, [username])
      .then(result => {
        const userAlreadyExists = result.rows[0].exists;
        
        if (userAlreadyExists) {
          res.status(409);
          return res.end()
        }
        else {
          const passwordHash = bcrypt.hashSync(password);

          const statement = "INSERT INTO app_user (username, screenname, password, role, date_registered) VALUES ($1, $2, $3, $4, $5)";
          const data = [username, screenname, passwordHash, 'user', timestamp.getCurrentTime()];
          
          return this.pool.query(statement, data)
            .then(() => res.end())
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500);
        return res.end();
      });
  };
}

module.exports = AuthenticationRouteHandler;