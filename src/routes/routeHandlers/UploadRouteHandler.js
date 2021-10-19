const moment = require('moment');
const mime = require('mime-types');
const jwt = require('jsonwebtoken');

const acceptedSources = require('../../constants/acceptedSources');
const acceptedFileFormats = require('../../constants/acceptedFileFormats');
const idols = require('../../constants/idols');
const apiSecret = process.env.API_SECRET;

function UploadRouteHandler(pool, dbx) {
  this.pool = pool;
  this.dbx = dbx;
  
  this.postComment = (req, res) => {
    const authorization = req.get('Authorization');

    let platform = req.body.platform;
    let filename = req.body.filename;
    let originalFilename = req.body.originalFilename;
    let username = req.body.username;
    let comment = req.body.comment;
    const twitterId = getId(authorization);
    let idol = req.body.idol;
    let source = req.body.source;

    // Do some validation on inputs
    filename = filename ? filename.substring(0, 200) : null;
    username = username ? username.substring(0, 30) : null;
    platform = platform ? platform.substring(0, 200) : null;
    comment = comment ? comment.substring(0, 500) : null;
    originalFilename = originalFilename ? originalFilename.substring(0, 200) : null;

    if (!idols.includes(idol)) { idol = null; }
    if (!acceptedSources.includes(source)) { source = null; }

    const statement = "INSERT INTO uploads(filename, username, platform, comment, timestamp, status, original_filename, twitter_id, idol, source) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)";
    const data = [filename, username, platform, comment, moment.utc().format('YYYY-MM-DD HH:mm:ss.SSS'), 'unprocessed', originalFilename, twitterId, idol, source];

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
  };
  
  this.getSignedURL = (req, res) => {
    const fileName = req.query['filename'];
    const fileType = req.query['filetype'];
    const source = req.query['source'];
    const idol = req.query['idol'];
    
    // Reject the request if the query contains invalid values
    if (acceptedFileFormats.indexOf(fileType) < 0 || acceptedSources.indexOf(source) < 0 || idols.indexOf(idol) < 0) {
      return res.sendStatus(415);
    }
    
    else {
      let fileExt = mime.extension(fileType);

      if (fileExt === 'jpeg') {
        fileExt = 'jpg';
      }

      const timestamp = moment().utcOffset(0).format('YYYYMMDDHHmmssSSS');
      const outputFilename = `${timestamp}-${idol}-${source}.${fileExt}`;
      const path = `/uploads/${outputFilename}`;

      const params = {
        commit_info: {
          path: path
        },
        duration: 60
      };

      dbx.filesGetTemporaryUploadLink(params)
        .then(response => {
          const returnData = {
            signedRequest: response.result.link,
            filename: outputFilename
          };

          res.set('Content-Type', 'application/json');
          return res.send(JSON.stringify(returnData));
        })
        .catch(err => {
          res.status(500);
          return res.end();
        });
    }
  };
}

const getId = authorization => {
  if (!authorization) {
    return null;
  }
  
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authorization.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, apiSecret);

    return decoded.id ? decoded.id : null;
  }
  catch(err) {
    // Token is invalid.
    return null;
  }
}

module.exports = UploadRouteHandler;