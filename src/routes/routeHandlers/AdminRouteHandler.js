const moment = require('moment');
const path = require('path');
const sharp = require('sharp');

const queueTableNames = require('../../constants/queueTableNames');
const acceptedSources = require('../../constants/acceptedSources');

function AdminRouteHandler(pool, dbx) {
  this.pool = pool;
  this.dbx = dbx;

  this.getQueue = (req, res) => {
    const idol = req.query.idol;
    const table = queueTableNames[idol];

    const statement = `SELECT filepath, comment FROM ${table} ORDER BY timestamp DESC`;

    return this.pool.query(statement)
      .then(response => {
        res.set('Content-Type', 'application/json');
        return res.send(JSON.stringify(response.rows));
      })
      .catch(err => {
        console.log(err);
        res.status(500);
        res.set('Content-Type', 'text/plain');
        return res.end();
      });
  };

  this.dequeueFile = (req, res) => {
    const idol = req.query.idol;
    const filepath = req.query.filepath;
    const table = queueTableNames[idol];

    const statement = `DELETE FROM ${table} WHERE filepath = $1`;
    const data = [filepath];

    return this.pool.query(statement, data)
      .then(response => {
        res.set('Content-Type', 'text/plain');
        return res.end();
      })
      .catch(err => {
        console.log(err);
        res.status(500);
        res.set('Content-Type', 'text/plain');
        return res.end();
      });
  }
  
  // Inserts a row into a queue table
  this.enqueue = (req, res) => {
    const idol = req.body.idol;
    const table = queueTableNames[idol];
    const source = req.body.source;
    const filename = req.body.filename;
    const filepath = `/${idol}/${source}/${filename}`;
    const comment = req.body.tweetText;

    const statement = `INSERT INTO ${table} (filepath, comment, timestamp) VALUES ($1, $2, $3)`;
    const data = [filepath, comment, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')];

    return this.pool.query(statement, data)
      .then(() => {
        console.log(`Added ${filepath} to ${table}`);

        res.set('Content-Type', 'text/plain');
        return res.end();
      })
      .catch(err => {
        console.log(err);
        res.status(500);
        res.set('Content-Type', 'text/plain');
        return res.end();
      });  
  };

  this.getUploads = (req, res) => {
    const statement = "SELECT filename, status, username, comment, (timestamp AT TIME ZONE \'UTC\') AS timestamp FROM uploads ORDER BY timestamp DESC LIMIT 100";

    return this.pool.query(statement)
      .then(result => {
        res.set('Content-Type', 'application/json');
        res.write(JSON.stringify(result.rows));
        
        return res.end();
      });
  };
  
  // Requests a temporary URL for accessing a stored object in Dropbox
  this.getImageURL = (req, res) => {
    const key = req.query['key'];

    res.set('Content-Type', 'text/plain');

    dbx.filesGetTemporaryLink({path: key})
      .then(response => {
        const link = response.link;
        return res.send(link);
      })
      .catch(err => {
        res.status(404);
        res.set('Content-Type', 'text/plain');
        return res.end();
      });
  };
  
  // Set status to rejected (We are no longer moving uploads to processed folder)
  this.rejectUpload = (req, res) => {
    const key = req.body.key;
    const filename = key.replace('/uploads/', '');
    const approver = req.body.approver;
    const remarks = req.body.remarks;

    const statement = "UPDATE uploads SET status = 'rejected', approver = $1, remarks = $2 WHERE filename = $3";
    const data = [approver, remarks, filename];

    return this.pool.query(statement, data)
      .then(() => {
        res.set('Content-Type', 'text/plain');
        res.end();
      })
      .catch(err => {
        console.log(err);
        res.status(500);
        res.set('Content-Type', 'text/plain');
        return res.end();
      });
  };
  
  // Deletes an uploaded file and removes record of the upload
  this.deleteUpload = (req, res) => {
    const key = req.body.key;
    const filename = key.replace('/uploads/', '');

    const params = {
      path: key
    };

    dbx.filesDeleteV2(params)
      .then(response => {
        const statement = "DELETE FROM uploads WHERE filename = $1";
        const data = [filename];

        return this.pool.query(statement, data);
      })
      .then(response => {
        res.set('Content-Type', 'text/plain');
        return res.end();
      })
      .catch(err => {
        console.log(err);
        res.status(500);
        res.set('Content-Type', 'text/plain');
        return res.end();
      });
  };
  
  // Accepts an upload and optionally queues it and/or converts a .png file to .jpg
  this.acceptUpload = (req, res) => {
    const key = req.body.key;
    const addToQueue = req.body.addToQueue;
    const convertToJPG = req.body.convertToJPG;
    const comment = req.body.tweetText ? req.body.tweetText : null;
    const filename = key.replace('/uploads/', '');
    const extension = path.extname(filename);
    const source = req.body.source;
    const idol = req.body.idol;
    const approver = req.body.approver;
    const remarks = req.body.remarks;

    let newKey;

    // Video files have a separate flow that requires manual conversion, just update the uploads table and wait for manual processing
    if (extension === '.mp4') {
      const statement = "UPDATE uploads SET status = 'approved', approver = $1, remarks = $2 WHERE filename = $3";
      const data = [approver, remarks, filename];

      return this.pool.query(statement, data)
        .then(() => {
          res.set('Content-Type', 'text/plain');
          return res.end();
        })
        .catch(err => {
          console.log(err);
          res.status(500);
          res.set('Content-Type', 'text/plain');
          return res.end();
        });
    }

    if (acceptedSources.indexOf(source) < 0) {
      res.status(400);
      res.set('Content-Type', 'text/plain');
      return res.end();
    }

    // This query will increment the counter and return the updated value
    const statement = "UPDATE file_counter SET counter = counter + 1 WHERE idol = $1 AND source = $2 RETURNING counter";
    const data = [idol, source];
    
    return this.pool.query(statement, data)
      .then(result => {
        const counter = result.rows[0].counter;
        
        // File is a .png, we will convert to .jpg to reduce file size
        if (convertToJPG) {
          // Download the original image to our server and perform conversion
          const params = {
            path: key
          };

          return dbx.filesDownload(params)
            .then(data => {
              return sharp(data.fileBinary)
                .jpeg()
                .toBuffer()
                .then(buffer => {
                  const newFilename = `${source}_${idol}_${counter}.jpg`;
                  newKey = `/${idol}/${source}/${newFilename}`;

                  const uploadParams = {
                    path: newKey,
                    contents: buffer
                  };

                  return dbx.filesUpload(uploadParams);
                });
            });
        }
        else {
          const newFilename = `${source}_${idol}_${counter}${extension}`;
          newKey = `/${idol}/${source}/${newFilename}`;
          
          const params = {
            from_path: key,
            to_path: newKey
          };
          
          return dbx.filesCopy(params);
        }
      })
      .then(() => {
        if (addToQueue) {
          const table = queueTableNames[idol];

          const statement = `INSERT INTO ${table} (filepath, comment, timestamp) VALUES ($1, $2, $3)`;
          const data = [newKey, comment, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')];
          
          return this.pool.query(statement, data);
        }
        else {
          return Promise.resolve();
        }
      })
      .then(() => {
        const statement = "UPDATE uploads SET status = 'approved', approver = $1, remarks = $2 WHERE filename = $3";
        const data = [approver, remarks, filename];

        return this.pool.query(statement, data);
      })
      .then(() => {
        res.set('Content-Type', 'text/plain');
        res.end();
      })
      .catch(err => {
        console.error(err);
        res.status(500);
        res.set('Content-Type', 'text/plain');
        return res.end();
      });
  };
}

module.exports = AdminRouteHandler;