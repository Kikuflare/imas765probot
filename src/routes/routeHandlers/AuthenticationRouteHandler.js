const jwt = require('jsonwebtoken');
const apiSecret = process.env.API_SECRET;
const moment = require('moment');

const BASIC_ROLE = 'user';

function AuthenticationRouteHandler(pool) {
  this.pool = pool;

  this.login = (req, res) => {
    const twitterId = req.user.id;
    const twitterUsername = req.user.username;

    const statement = "SELECT user_role FROM users WHERE twitter_id = $1 LIMIT 1";
    const data = [twitterId];

    return this.pool.query(statement, data)
      .then(result => {
        const rowCount = result.rowCount;
        const timestamp = moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS');

        if (rowCount < 1) {
          console.log(`Creating new user with twitter_id: ${twitterId}`);

          const statement = "INSERT INTO users (twitter_id, twitter_username, user_role, date_registered, last_modified, ranking, anonymous) VALUES ($1, $2, $3, $4, $5, $6, $7)";
          const data = [twitterId, twitterUsername, BASIC_ROLE, timestamp, timestamp, false, true];

          return this.pool.query(statement, data)
            .then(() => Promise.resolve(BASIC_ROLE));
        }
        else {
          const role = result.rows[0].user_role;
          const statement = "UPDATE users SET twitter_username = $1, last_modified = $2 WHERE twitter_id = $3";
          const data = [twitterUsername, timestamp, twitterId];

          return this.pool.query(statement, data)
            .then(() => Promise.resolve(role));
        }
      })
      .then(role => {
        const claim = {
          sub: twitterUsername,
          role: role,
          id: twitterId
        };
        
        const token = jwt.sign(claim, apiSecret, { expiresIn: '24h' });

        res.redirect(`/login-redirect?token=${token}`);
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
    const existsStatement = "SELECT EXISTS (SELECT 1 FROM app_user WHERE username=$1 LIMIT 1);";
    
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
            .then(() => res.end());
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500);
        return res.end();
      });
  };

  // Generates a new authentication token using an old one
  this.refresh = (req, res) => {
    const twitterId = res.locals.id;

    if (twitterId) {
      const statement = "SELECT user_role, twitter_username FROM users WHERE twitter_id = $1 LIMIT 1";
      const data = [twitterId];

      return this.pool.query(statement, data)
        .then(result => {
          const rowCount = result.rowCount;

          if (rowCount < 1) {
            res.status(400);
            return res.end();
          }
          else {
            const role = result.rows[0].user_role;
            const twitterUsername = result.rows[0].twitter_username;

            const claim = {
              sub: twitterUsername,
              role: role,
              id: twitterId
            };
        
            const refresh = jwt.sign(claim, apiSecret, { expiresIn: '24h' });
        
            res.set('Content-Type', 'application/json');
            return res.send(JSON.stringify({auth: refresh}));
          }
        })
    }
    else {
      res.status(400);
      return res.end();
    }
  }
}

module.exports = AuthenticationRouteHandler;