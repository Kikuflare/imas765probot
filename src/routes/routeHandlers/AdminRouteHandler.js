const moment = require('moment');
const path = require('path');
const sharp = require('sharp');

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
    // source and idol are reversed in the filepath if the source is 'birthday' THIS IS INTENTIONAL
    const filepath = source === 'birthday' ? `${source}/${idol}/${filename}` : `${idol}/${source}/${filename}`;
    
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
        
        const statement = "SELECT filename, username, comment, (timestamp AT TIME ZONE \'UTC\') AS timestamp FROM uploads WHERE filename = ANY($1)";
        
        return this.pool.query(statement, [queryData]);

      })
      .then(result => {
        res.set('Content-Type', 'application/json');
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
        
        res.set('Content-Type', 'application/json');
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

      res.set('Content-Type', 'application/json');
      res.write(url);
      res.end();
    });
  };
  
  // Moves an uploaded file to the processed folder
  this.rejectUpload = (req, res) => {
    const key = req.body.key;
    const newKey = key.replace('uploads/', 'processed/');
    const approver = req.body.approver;
    const remarks = req.body.remarks;

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
      .then(() => {
        const query = {
          text: "UPDATE uploads SET status = 'rejected', approver = $1, remarks = $2 WHERE filename = $3",
          values: [approver, remarks, key.split('/')[1]]
        };

        return this.pool.query(query);
      })
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
  
  // Accepts an upload and optionally queues it and/or converts a .png file to .jpg
  this.acceptUpload = (req, res) => {
    const key = req.body.key;
    const addToQueue = req.body.addToQueue;
    const convertToJPG = req.body.convertToJPG;
    const comment = req.body.tweetText ? req.body.tweetText : null;
    const filename = path.basename(key);
    const filenameSplit = filename.split('.')[0].split('-');
    const extension = path.extname(filename);
    const idol = req.body.idol;
    const source = req.body.source;
    const approver = req.body.approver;
    const remarks = req.body.remarks;

    let newKey;

    // Video files have a separate flow that requires manual conversion, just update the uploads table and wait for manual processing
    if (extension === '.mp4') {
      const copyParams = {
        Bucket: S3_BUCKET,
        CopySource: `${S3_BUCKET}/${key}`,
        Key: key.replace('uploads/', 'processed/')
      };
      
      const deleteParams = {
        Bucket: S3_BUCKET,
        Key: key
      };
  
      return this.s3.copyObject(copyParams).promise()
        .then(() => this.s3.deleteObject(deleteParams).promise())
        .then(() => {
          const query = {
            text: "UPDATE uploads SET status = 'approved', approver = $1, remarks = $2 WHERE filename = $3",
            values: [approver, remarks, key.split('/')[1]]
          };
  
          return this.pool.query(query);
        })
        .then(() => res.end())
        .catch(err => {
          res.status(500);
          return res.end();
        });
    }

    if (acceptedSources.indexOf(source) < 0) {
      res.status(400);
      return res.end();
    }

    // This query will increment the counter and return the updated value
    const statement = "UPDATE file_counter SET counter = counter + 1 WHERE idol = $1 AND source = $2 RETURNING counter";
    
    return this.pool.query(statement, [idol, source])
      .then(result => {
        const counter = result.rows[0].counter;
        
        // File is a .png, we will convert to .jpg to reduce file size
        if (convertToJPG) {
          const newFilename = `${source}_${idol}_${counter}.jpg`;
          newKey = `${idol}/${source}/${newFilename}`;
          
          // Download the original image to our server and perform conversion
          const params = {
            Bucket: S3_BUCKET,
            Key: key
          };
          
          return s3.getObject(params).promise()
            .then(data => {
              return sharp(data.Body)
                .jpeg()
                .toBuffer()
                .then(buffer => {
                  const uploadParams = {
                    Bucket: S3_BUCKET,
                    Key: newKey,
                    Body: buffer
                  };

                  return s3.upload(uploadParams).promise();
                })
                .catch(err => {
                  console.log(err);
                  return Promise.reject(err);
                });
            })
        }
        else {
          const newFilename = `${source}_${idol}_${counter}${extension}`;
          newKey = `${idol}/${source}/${newFilename}`;
          
          const copyParams = {
            Bucket: S3_BUCKET,
            CopySource: `${S3_BUCKET}/${key}`,
            Key: newKey
          };
          
          return this.s3.copyObject(copyParams).promise()
        }
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
          const queueData = [newKey, comment, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')];
          
          return this.pool.query(queueStatement, queueData);
        }
        else {
          return Promise.resolve();
        }
      })
      .then(() => {
        const query = {
          text: "UPDATE uploads SET status = 'approved', approver = $1, remarks = $2 WHERE filename = $3",
          values: [approver, remarks, key.split('/')[1]]
        };

        return this.pool.query(query);
      })
      .then(() => res.end())
      .catch(err => {
        console.error(err);
        res.status(500);
        return res.end();
      })
  };
}

module.exports = AdminRouteHandler;