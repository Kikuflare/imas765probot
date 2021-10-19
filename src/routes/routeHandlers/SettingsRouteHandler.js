const moment = require('moment');

function SettingsRouteHandler(pool) {
  this.pool = pool;
  
  this.getSettings = (req, res) => {
    const twitterId = res.locals.id;

    if (twitterId) {
      const statement = "SELECT ranking, anonymous FROM users WHERE twitter_id = $1";
      const data = [twitterId];

      return this.pool.query(statement, data)
        .then(result => {
          res.set('Content-Type', 'application/json');
          return res.send(JSON.stringify(result.rows[0]));
        })
        .catch(err => {
          console.error(err);
          res.status(500);
          return res.end();
        })
    }
    else {
      res.status(400);
      return res.end();
    }
  };

  this.setSettings = (req, res) => {
    const twitterId = res.locals.id;
    let ranking = !!req.body.ranking;
    let anonymous = !!req.body.anonymous;

    if (twitterId) {
      const timestamp = moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS');
      const statement = "UPDATE users SET ranking = $1, anonymous = $2, last_modified = $3 WHERE twitter_id = $4";
      const data = [ranking, anonymous, timestamp, twitterId];

      return this.pool.query(statement, data)
        .then(() => {
          res.set('Content-Type', 'text/plain');
          res.end();
        })
        .catch(err => {
          console.error(err);
          res.status(500);
          return res.end();
        });
    }
    else {
      res.status(400);
      return res.end();
    }
  }
}

module.exports = SettingsRouteHandler;