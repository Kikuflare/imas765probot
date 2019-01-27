const moment = require('moment');
const mime = require('mime-types');

const acceptedSources = require('../../constants/acceptedSources');
const acceptedFileFormats = require('../../constants/acceptedFileFormats');
const idols = require('../../constants/idols');

const S3_BUCKET = process.env.S3_BUCKET_NAME;

function UploadRouteHandler(pool, s3) {
  this.pool = pool;
  this.s3 = s3;
  
  this.postComment = (req, res) => {
    let username = req.body.username;
    let comment = req.body.comment;
    let platform = req.body.platform;
    
    // Do some validation on inputs
    if (username.length > 30) {
      username = username.substring(0, 30);
    }
    else if (username.length < 1) {
      username = null;
    }
    if (comment.length > 500) {
      comment = comment.substring(0, 500);
    }
    else if (comment.length < 1) {
      comment = null;
    }
    if (platform.length < 1) {
      platform = null;
    }
    
    const statement = "INSERT INTO uploads(filename, username, platform, comment, timestamp, status, original_filename) values($1, $2, $3, $4, $5, $6, $7)";
    const data = [req.body.filename, username, platform, comment, moment.utc().format('YYYY-MM-DD HH:mm:ss.SSS'), 'unprocessed', req.body.originalFilename];
    
    return this.pool.query(statement, data)
      .then(() => res.end())
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
      
      // I decided that I prefer .jpg extension to .jpeg
      if (fileExt === 'jpeg') {
        fileExt = 'jpg';
      }
      
      const timestamp = moment().utcOffset(0).format('YYYYMMDDHHmmssSSS');
      const outputFilename = `${timestamp}-${idol}-${source}.${fileExt}`
      const key = `uploads/${outputFilename}`;
      
      const s3Params = {
        Bucket: S3_BUCKET,
        Key: key,
        Expires: 60
      };

      /* TODO: s3.getSignedUrl currently cannot be made into a Promise, replace
       * the callback with a Promise once aws-sdk-js supports it
       * https://github.com/aws/aws-sdk-js/issues/1008
       */
      this.s3.getSignedUrl('putObject', s3Params, (err, data) => {
        if (err) {
          console.log(err);
          return res.end();
        }
        else {
          const returnData = {
            signedRequest: data,
            filename: outputFilename
          };
          
          res.set('Content-Type', 'application/json');
          res.write(JSON.stringify(returnData));
          res.end();
        }
      });
    }
  };
}

module.exports = UploadRouteHandler;