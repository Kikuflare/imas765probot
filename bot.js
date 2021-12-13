// Twitter Bot class file

// Imports
const Twitter = require('twitter');
const path = require('path');
const Promise = require('bluebird');
const mime = require('mime-types');
const fs = require("fs");
const moment = require('moment');
const mkdirp = require('mkdirp');
const instanceId = require("crypto").randomBytes(4).toString("hex");

// Bluebird setting
Promise.onPossiblyUnhandledRejection(error => {
  throw error;
});

// Config
const CHUNK_SIZE = 1048576; // bytes; do not set this over 5MB

// Dropbox API
const fetch = require('isomorphic-fetch');
const Dropbox = require('dropbox').Dropbox;

module.exports = class TwitterBot {
  constructor(botConfig, pool) {
    this.pool = pool; // This pool is shared between bots
    this.dbx = new Dropbox({accessToken: process.env.DROPBOX_ACCESS_TOKEN, fetch: fetch});

    // Create twitter client using API keys and secrets
    this.client = new Twitter({
      consumer_key: process.env.CONSUMER_KEY,
      consumer_secret: process.env.CONSUMER_SECRET,
      access_token_key: botConfig.accessToken,
      access_token_secret: botConfig.accessTokenSecret
    });
   
    // Feature switches
    this.tweetEnabled = botConfig.tweetEnabled;
   
    // External resources
    this.folderPrefix = botConfig.folderPrefix;
    this.queueTable = botConfig.queueTable;
    this.tweetHistoryTable = botConfig.tweetHistoryTable;
   
    // Bot specific settings
    this.screenName = botConfig.screenName;
    this.recentLimit = botConfig.recentLimit;
   
    // App settings
    this.recordTweetEnabled = JSON.parse(process.env.RECORD_TWEET_ENABLED);
    this.enqueueSmartEnabled = JSON.parse(process.env.ENQUEUE_SMART);
   
   
    /* Post a tweet.
     * 1. Get tweet data from queue
     * 2. Download the file
     * 3. Upload the file in chunks
     * 4. Post the tweet with the media and comment
     * 5. Record the tweet in a table
     */
    this.tweet = () => {
      var filepath;
      var comment;

      return this.retry(10, this.downloadLatestFile)
        .then(result => {
          filepath = result.filepath;
          comment = result.comment;
          
          return this.retryWithDelay(10, 1000, () => this.postMedia(filepath), this.tweetRetryHandler);
        })
        .then(mediaIdString => {
          // Check tweetRetryHandler() for the cases in which we will retry
          return this.retryWithDelay(3, 1000, () => this.updateStatus(mediaIdString, comment), this.tweetRetryHandler);
        })
        .then(() => {
          const fileName = path.basename(filepath);
          console.log(`[${instanceId}] ${this.screenName}: Tweeted file ${fileName}`);

          return this.recordTweetEnabled ? this.recordTweet(filepath, comment) : Promise.resolve();
        })
        .catch(err => {
          if (err && err.response && err.response.status === 409) {
            console.log(`[${instanceId}] ${this.screenName}: All download attempts failed.`);
          }
          else if (err && err.code === 130) {
            console.log(`[${instanceId}] ${this.screenName}: Failed to tweet, Twitter is over capacity.`);
          }
          else {
            console.log(`[${instanceId}] ${this.screenName}: An error occurred while attempting to tweet, failed filepath was ${filepath}`);
            console.log(err);
          }

          return Promise.resolve();
        })
        .finally(() => this.retryWithDelay(3, 1000, () => this.deleteRow(this.queueTable, 'filepath', filepath)));
    };

    // Utility method that only calls enqueue if queue is empty
    this.enqueueWhenEmpty = () => {
      return this.countRows(this.queueTable)
        .then(result => {
          if (result === 0) {
            return this.enqueueSmartEnabled ? this.enqueueSmart() : this.enqueue();
          }
          else {
            return Promise.resolve();
          }
        });
    }


    /* Adds Dropbox filepaths to the queue table
     * 1. Retrieve recently posted media
     * 2. Retrieve list of objects with a specified prefix
     * 3. Generates a shuffled list
     * 4. Sequentially adds rows to the queue table
     *
     * This ensures that recently posted files will not be posted again until a
     * certain amount of time has passed, but requires posting records to be
     * kept in a tweet_history table.
     */
    this.enqueueSmart = () => {
      let recentMedia;

      return this.getRecentHistory(this.tweetHistoryTable)
        .then(results => {
          recentMedia = results.rows.map(row => row.filepath);

          return this.listObjects()
        })
        .then(results => {
          const filePool = results
            .filter(item => {
              const filepath = item.path_lower;

              // Filter out folder names and birthday/seasonal files
              return filepath.includes('.')
                && !filepath.includes('birthday')
                && !filepath.includes('seasonal');
            })
            .map(item => item.path_lower);
          
          const queue = this.generateQueue(filePool, recentMedia);

          return this.bulkInsert(queue.slice().reverse());
        })
        .catch(err => {
          console.log(`[${instanceId}] ${this.screenName} : An error occurred while attempting to enqueue.`);
          console.log(err);
          return Promise.reject(err);
        });
    };
    
    /* Adds Dropbox filepaths to the queue table
     * 1. Retrieve list of objects with a specified prefix
     * 2. Generates a shuffled list
     * 3. Sequentially adds rows to the queue table
     *
     * Randomly shuffles all files in the pool without regard to recent post
     * history.
     */
    this.enqueue = () => {
      return this.listObjects()
        .then(results => {
          const filePool = results
            .filter(item => {
              const filepath = item.path_lower;

              // Filter out folder names and birthday/seasonal files
              return filepath.includes('.')
                && !filepath.includes('birthday')
                && !filepath.includes('seasonal');
            })
            .map(item => item.path_lower);
          
            const queue = this.shuffleArray(filePool);

          return this.bulkInsert(queue.slice().reverse());
        })
        .catch(err => {
          console.log(`[${instanceId}] ${this.screenName} : An error occurred while attempting to enqueue.`);
          console.log(err);
          return Promise.reject(err);
        });
    };

    /* Takes a file path and checks if it exists locally.
     * If not, attempts to download it from Dropbox
     */
    this.downloadLatestFile = () => {
      let filepath;
      let comment;
      let fileExists;
      
      return this.getLatestRow(this.queueTable)
        .then(result => {
          filepath = result.rows[0].filepath;
          comment = result.rows[0].comment;

          return this.checkFileExists(filepath);
        })
        .then(result => {
          fileExists = result;

          if (fileExists) {
            return Promise.resolve({
              filepath: filepath,
              comment: comment
            });
          }
          else {
            return this.downloadFile(filepath)
              .then(() => Promise.resolve({
                filepath: filepath,
                comment: comment
              }));
          }
        })
        .catch(err => {
          if (err && err.status === 409) {
            console.log(`[${instanceId}] ${this.screenName}: Could not download ${filepath}, the file does not exist in the Dropbox folder.`);
          }
          else if (err && err.name === 'FetchError') {
            console.log(`[${instanceId}] ${this.screenName}: ${err.message}`);
            return Promise.reject(err);
          }
          else {
            console.log(`[${instanceId}] ${this.screenName} : An error occurred while attempting to download the latest file.`);
            console.log(err);
          }

          return this.deleteRow(this.queueTable, 'filepath', filepath)
            .then(() => Promise.reject(err));
        });
    };


    // Gets object data and writes to a file
    this.downloadFile = filepath => {
      return this.createDirectory(filepath)
        .then(() => this.getObject(filepath))
        .then(response => this.writeFile(filepath, response.result));
    };
    
    
    // Chains all steps involved in posting media to Twitter
    this.postMedia = filepath => {
      let mediaIdString;
      
      return this.initUpload(filepath)
        .then(result => {
          mediaIdString = result.media_id_string;

          return this.retryWithDelay(5, 1000, () => this.appendUpload(filepath, mediaIdString));
        })
        .then(() => this.retryWithDelay(3, 1000, () => this.finalizeUpload(mediaIdString)));
    };
    

    // Initializes upload by posting the filesize and filetype
    this.initUpload = filepath => {
      const mimeType = mime.lookup(filepath);

      const stat = fs.statSync(path.join(__dirname, filepath));

      if (stat.size === 0) {
        console.log(`[${instanceId}] ${this.screenName} : File size is 0!`);
        // TODO: handle this case
      }

      return this.client.post('media/upload', {
        command : 'INIT',
        total_bytes : stat.size,
        media_type : mimeType,
      })
        .catch(err => {
          console.log(`[${instanceId}] ${this.screenName} : INIT failed`);
          return Promise.reject(err);
        });
    };


    // Posts chunks of the file in sequential order
    this.appendUpload = (filepath, mediaIdString) => {
      const readPath = path.join(__dirname, filepath);

      const stat = fs.statSync(readPath);

      if (stat.size === 0) {
        console.log(`[${instanceId}] ${this.screenName} : File size is 0!`);
        // TODO: handle this case
      }

      return new Promise((resolve, reject) => {
        let isUploading = false;
        let isFinishedReading = false;
        let isError = false;

        const readStream = fs.createReadStream(readPath, { highWaterMark: CHUNK_SIZE });

        var currentChunkIndex = 0;

        readStream.on('data', chunk => {
          readStream.pause();

          if (isError) {
            return reject();
          }
          
          isUploading = true;

          const payload = {
            command: 'APPEND',
            media_id: mediaIdString,
            media: chunk,
            segment_index: currentChunkIndex
          };

          this.client.post('media/upload', payload)
            .then(() => {
              isUploading = false;

              if (isFinishedReading) {
                return resolve();
              }
              else {
                currentChunkIndex++;
                readStream.resume();
                return;
              }
            })
            .catch(err => {
              isError = true;
              console.log(`[${instanceId}] ${this.screenName} : APPEND failed`);
              return reject(err);
            });
        });

        readStream.on('end', () => {
          isFinishedReading = true;

          if (!isUploading && !isError) {
            return resolve();
          }
          else {
            return;
          }
        })
      });
    };


    // Notifies Twitter that all chunks of the file has been uploaded
    this.finalizeUpload = mediaIdString => {
      return this.client.post('media/upload', {
        command: 'FINALIZE',
        media_id: mediaIdString
      })
        .then(() => Promise.resolve(mediaIdString))
        .catch(err => {
          console.log(`[${instanceId}] ${this.screenName} : FINALIZE failed`);
          return Promise.reject(err);
        });
    };


    // Post the tweet with media and comment
    this.updateStatus = (mediaIdString, comment) => {
      const payload = {
        status: comment,
        media_ids: mediaIdString
      };
     
      return this.client.post('statuses/update', payload)
        .catch(err => {
          console.log(`[${instanceId}] ${this.screenName} : status update failed`);
          return Promise.reject(err);
        });
    };


    // Create directories
    this.createDirectory = filepath => {
      const dirname = path.dirname(path.join(__dirname, filepath));

      return mkdirp(dirname);
    };


    // Get file data from Dropbox
    this.getObject = filepath => {
      const params = {
        path: filepath
      };

      return this.dbx.filesDownload(params);
    };


    // Write data received from Dropbox into a file
    this.writeFile = (filepath, data) => {
      return new Promise((resolve, reject) => {
        const savePath = path.join(__dirname, filepath);
        const writeStream = fs.createWriteStream(savePath);

        writeStream.on('open', () => {
          writeStream.write(data.fileBinary);
          writeStream.end();
        });

        writeStream.on('finish', () => {
          return resolve();
        });

        writeStream.on('error', err => {
          console.log(`[${instanceId}] ${this.screenName} : An error occurred while attempting to write to file. savePath: ${savePath}`);
          console.log(err);
          return reject(err);
        });
      });
    };


    // Passes true if file exists, false if not
    this.checkFileExists = filepath => {
      return fs.existsSync(path.join(__dirname, filepath));
    };


    // Lists objects with a specified prefix
    this.listObjects = () => {
      const params = {
        path: `/${this.folderPrefix}`,
        recursive: true
      };

      const items = [];
      
      return this.dbx.filesListFolder(params)
        .then(response => {
          items.push(...response.result.entries);

          if (response.result.has_more) {
            return this.listObjectsContinue(response.result.cursor)
              .then(next => {
                items.push(...next);
                return Promise.resolve(items);
              });
          }
          else {
            return Promise.resolve(items);
          }
        });
    };


    // Retrieves more objects if Dropbox tells us that there are more remaining
    this.listObjectsContinue = cursor => {
      const params = {
        cursor: cursor
      };

      const items = [];

      return this.dbx.filesListFolderContinue(params)
        .then(response => {
          items.push(...response.result.entries);

          if (response.result.has_more) {
            return this.listObjectsContinue(response.result.cursor)
              .then(next => {
                items.push(...next);
                return Promise.resolve(items);
              });
          }
          else {
            return Promise.resolve(items);
          }
        });
    };


    // Durstenfeld Shuffle (taken from Stack Overflow)
    // http://stackoverflow.com/a/12646864
    this.shuffleArray = array => {
      for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }
      return array;
    };


    /* Creates a list of media and guarantees that recently posted media
     * will not be near the front of the queue
     *
     *  temp1 is a list of files eligible to be placed at the start of the queue
     *  temp2 is all other files
     *  queue is the final ordering
     *
     *  temp1 is shuffled, then values are popped off into queue until the limit
     *  is reached, then the rest are dropped into temp2
     *
     *  temp2 is shuffled, then added to the end of the queue
     *
     *  Return queue, which will be reversed later by a separate function
     */
    this.generateQueue = (filePool, recentMedia) => {
      var temp1 = [];
      var temp2 = [];
      var queue = [];
     
      // Splits filePool into two arrays
      for (const item of filePool) {
        if (!recentMedia.includes(item)) {
          temp1.push(item);
        }
        else {
          temp2.push(item);
        }
      }
     
      // Shuffle the eligible files
      this.shuffleArray(temp1);

      // Add files to queue until the limit is reached, then add the rest to the temp2
      const end = temp1.length;
      const limit = Math.min(this.recentLimit, temp1.length);

      for (var i = 0; i < end; i++) {
        if (i < limit) {
          queue.push(temp1.shift());
        }
        else {
          temp2.push(temp1.shift());
        }
      }
     
      // Shuffle the remainders and add them to the queue
      this.shuffleArray(temp2);
      queue = queue.concat(temp2);
     
      return queue;
    };


    // Get the latest row from the queue
    this.getLatestRow = tableName => {
      const statement = `SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT 1`;
     
      return this.pool.query(statement);
    };


    // Delete a row from a table
    this.deleteRow = (tableName, column, value) => {
      const statement = `DELETE FROM ${tableName} WHERE ${column} = $1`;
     
      return this.pool.query(statement, [value]);
    };


    // Inserts rows one at time using a single client from the pool
    this.bulkInsert = values => {
      const statement = `INSERT INTO ${this.queueTable} (filepath, comment, timestamp) VALUES ($1, $2, $3)`;
      var pgClient;

      return this.pool.connect()
        .then(client => {
          pgClient = client;

          return Promise.each(values, value => {
            return client.query(statement, [value, null, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')])
              .catch(err => {
                console.log(`[${instanceId}] ${this.screenName}: Failed to insert ${value}`);
                Promise.resolve();
              });
          });
        })
        .then(() => {
          pgClient.release();
          console.log(`[${instanceId}] ${this.screenName}: File queue shuffled.`);
          return Promise.resolve();
        })
        .catch(err => {
          console.log(`[${instanceId}] ${this.screenName} : An error occurred while attempting to bulkInsert.`);
          return Promise.reject(err);
        });
    };


    // Records tweet data into history table
    this.recordTweet = (filepath, comment) => {
      const statement = `INSERT INTO ${this.tweetHistoryTable} (filepath, comment, timestamp) VALUES ($1, $2, $3)`;
     
      return this.pool.query(statement, [filepath, comment, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')]);
    };


    // Get recently posted media
    this.getRecentHistory = tableName => {
      const statement = `SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT ${this.recentLimit}`;
     
      return this.pool.query(statement);
    };


    // Count the number of rows in a table
    this.countRows = tableName => {
      const statement = `SELECT count(*) FROM ${tableName}`;
     
      return this.pool.query(statement)
        .then(result => {
          const count = result.rows[0].count;
          return Promise.resolve(parseInt(count));
        });
    };

    // Wraps functions to make them retry on failure
    // func should return a promise!
    this.retry = (remainingRetries, func) => {
      return func()
        .catch(err => remainingRetries <= 0 ? Promise.reject(err) : this.retry(remainingRetries - 1, func));
    };
    
    /* Retries on failure, but with a delay between attempts
     * predicate is a function that takes error as an argument and returns true if it is safe to retry */
    this.retryWithDelay = (remainingRetries, interval, func, predicate) => {
      return func()
        .catch(err => {
          if (remainingRetries <= 0) {
            return Promise.reject(err);
          }
          else {
            if (predicate) {
              if (predicate(err)) {
                return Promise.delay(interval)
                  .then(() => this.retryWithDelay(remainingRetries - 1, interval, func, predicate));
              }
              else {
                return Promise.reject(err);
              }
            }
            else {
              return Promise.delay(interval)
                .then(() => {
                  return this.retryWithDelay(remainingRetries - 1, interval, func, predicate);
                });
            }
          }
        });
    };

    this.tweetRetryHandler = err => {
      if (err && err.message && err.message.includes('400 Bad Request')) {
        console.log(`[${instanceId}] ${this.screenName}: ${err.message} - Retrying...`);

        return true;
      }
      // err can potentially be an array containing objects with the form {message: String, code: Number}
      else if (err && err.constructor === Array) {
        for (const error of err) {
          if (error.constructor === Object) {
            // Over capacity
            if (error.code === 130) {
              return true;
            }
            else if (error.code === 131) {
              return true;
            }
            else {
              continue;
            }
          }
        }

        return false;
      }
      else {
        return false;
      }
    };
  }
};