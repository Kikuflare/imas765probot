const moment = require('moment');
const path = require('path');

const queueTableNames = require('../../constants/queueTableNames');
const acceptedSources = require('../../constants/acceptedSources');
const S3_BUCKET = process.env.S3_BUCKET_NAME;


function AdminRouteHandler(pool, s3) {
  this.pool = pool;
  this.s3 = s3;
  
  // Inserts a row into a queue table
  this.updateQueue = (req, res) => {
    const idol = req.body.idol;
    const table = queueTableNames[idol];
    const source = req.body.source;
    const filename = req.body.filename;
    const filepath = `${idol}/${source}/${filename}`;
    const comment = req.body.comment ? req.body.comment : null;
    
    const statement = `INSERT INTO ${table} (filepath, comment, timestamp) VALUES ($1, $2, $3)`;
    const data = [filepath, comment, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')];
    
    return this.pool.query(statement, data)
      .then(() => {
        console.log(`Added ${filepath} to ${table}`);
        res.end();
      })
      .catch(err => {
        console.error(err);
        res.end();
      });    
  };
  
  /* Checks if the S3 bucket contains keys with the prefix 'upload/' and retrieves
   * the associated data from the uploads table
   */
  this.getUploads = (req, res) => {
    const prefix = req.query['prefix'];

    const params = {
      Bucket: S3_BUCKET,
      Prefix: prefix
    };
    
    return this.s3.listObjectsV2(params).promise()
      .then(data => {
        const queryData = [];
        
        for (const item of data.Contents) {
          const key = item.Key;
          
          if (!key.endsWith('/')) {
            queryData.push(key.replace('uploads/', ''));
          }
        }
        
        const statement = "SELECT filename, username, comment, timestamp FROM uploads WHERE filename = ANY($1)";
        
        return this.pool.query(statement, [queryData]);

      })
      .then(result => {
        res.write(JSON.stringify(result.rows));
        return res.end();
      })
      .catch(err => {
        console.log(err);
        res.status(500);
        return res.end();
      });
  }
  
  // Gets keys with the specified prefix
  this.getObjects = (req, res) => {
    const prefix = req.query['prefix'];

    const params = {
      Bucket: S3_BUCKET,
      Prefix: prefix
    };
    
    this.s3.listObjectsV2(params).promise()
      .then(data => {
        const result = [];
        
        for (const item of data.Contents) {
          const key = item.Key;
          
          if (!key.endsWith('/')) {
            result.push(key.replace(prefix, ''));
          }
        }
        
        res.write(JSON.stringify(result));
        return res.end();
      })
      .catch(err => {
        console.log(err);
        res.status(500);
        return res.end();
      });
  }
  
  // Requests a temporary URL for accessing a stored object in S3
  this.getImageURL = (req, res) => {
    const key = req.query['key'];

    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      Expires: 900
    };
    
    /* TODO: s3.getSignedUrl currently cannot be made into a Promise, replace
     * the callback with a Promise once aws-sdk-js supports it
     * https://github.com/aws/aws-sdk-js/issues/1008
     */
    this.s3.getSignedUrl('getObject', params, (err, url) => {
      if (err) {
        console.log(err);
        return res.end();
      }
       
      res.write(url);
      res.end();
    });
  };
  
  // Moves an uploaded file to the processed folder
  this.rejectUpload = (req, res) => {
    const key = req.body.key;
    const newKey = key.replace('uploads/', 'processed/');

    const copyParams = {
      Bucket: S3_BUCKET,
      CopySource: `${S3_BUCKET}/${key}`,
      Key: newKey
    };
    
    const deleteParams = {
      Bucket: S3_BUCKET,
      Key: key
    };

    return this.s3.copyObject(copyParams).promise()
      .then(() => this.s3.deleteObject(deleteParams).promise())
      .then(() => res.end())
      .catch(err => {
        res.status(500);
        return res.end();
      });
  };
  
  // Deletes an uploaded file and removes record of the upload
  this.deleteUpload = (req, res) => {
    const key = req.body.key;
    const filename = key.replace('uploads/', '');

    const deleteParams = {
      Bucket: S3_BUCKET,
      Key: key
    };
    
    return this.s3.deleteObject(deleteParams).promise()
      .then(() => {
        const statement = "DELETE FROM uploads WHERE filename = $1";
        
        return this.pool.query(statement, [filename]);
      })
      .then(() => res.end())
      .catch(err => {
        console.log(err);
        res.status(500);
        return res.end();
      });
  };
  
  // Accepts an upload and optionally queues it
  this.acceptUpload = (req, res) => {
    const key = req.body.key;
    const addToQueue = req.body.addToQueue;
    const filename = path.basename(key);
    const filenameSplit = filename.split('.')[0].split('-');
    const extension = path.extname(filename);
    const idol = filenameSplit[1];
    const source = filenameSplit[2];
    let newKey;
    
    if (acceptedSources.indexOf(source) < 0) {
      res.status(400);
      return res.end();
    }
    
    // This query will increment the counter and return the updated value
    const statement = "UPDATE file_counter SET counter = counter + 1 WHERE idol = $1 AND source = $2 RETURNING counter";
    
    return this.pool.query(statement, [idol, source])
      .then(result => {
        const counter = result.rows[0].counter;
        const newFilename = `${source}_${idol}_${counter}${extension}`;
        newKey = `${idol}/${source}/${newFilename}`;
        
        const copyParams = {
          Bucket: S3_BUCKET,
          CopySource: `${S3_BUCKET}/${key}`,
          Key: newKey
        };
        
        return this.s3.copyObject(copyParams).promise()
      })
      .then(() => {
        const deleteParams = {
          Bucket: S3_BUCKET,
          Key: key
        };
        
        return this.s3.deleteObject(deleteParams).promise()
      })
      .then(() => {
        if (addToQueue) {
          const table = queueTableNames[idol];

          const queueStatement = `INSERT INTO ${table} (filepath, comment, timestamp) VALUES ($1, $2, $3)`;
          const queueData = [newKey, null, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')];
          
          return this.pool.query(queueStatement, queueData)
            .then(() => res.end());
        }
        else {
          return res.end();
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500);
        return res.end();
      })
  };
}

module.exports = AdminRouteHandler;