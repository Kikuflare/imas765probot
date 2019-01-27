// Twitter Bot class file

// Imports
const Twitter = require('twitter');
const path = require('path');
const Promise = require('bluebird');
const mime = require('mime-types');
const fs = Promise.promisifyAll(require("fs"));
const moment = require('moment');


// Bluebird setting
Promise.onPossiblyUnhandledRejection((error)=>{
  throw error;
});


// Config
const CHUNK_SIZE = 1048576; // bytes; do not set this over 5MB


// AWS connection
const aws = require('aws-sdk');
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-west-2',
  signatureVersion: 'v4'
});
aws.config.setPromisesDependency(Promise);
const s3 = new aws.S3();

module.exports = class TwitterBot {
  constructor(botConfig, pool) {
    this.pool = pool; // This pool is shared between bots

    // Create twitter client using API keys and secrets
    this.client = new Twitter({
      consumer_key: process.env.CONSUMER_KEY,
      consumer_secret: process.env.CONSUMER_SECRET,
      access_token_key: botConfig.accessToken,
      access_token_secret: botConfig.accessTokenSecret
    });
   
    // Feature switches
    this.tweetEnabled = botConfig.tweetEnabled;
    this.followEnabled = botConfig.followEnabled;
    this.unfollowEnabled = botConfig.unfollowEnabled;
    this.blockEnabled = botConfig.blockEnabled;
    this.preloadEnabled = botConfig.preloadEnabled;
   
    // External resources
    this.bucketName = botConfig.bucketName;
    this.bucketPrefix = botConfig.bucketPrefix;
    this.queueTable = botConfig.queueTable;
    this.tweetHistoryTable = botConfig.tweetHistoryTable;
    this.requestSentTable = botConfig.requestSentTable;
   
    // Bot specific settings
    this.screenName = botConfig.screenName;
    this.recentLimit = botConfig.recentLimit;
    this.maxDownloadAttempts = botConfig.maxDownloadAttempts;
   
    // App settings
    this.blockThreshold = process.env.BLOCK_THRESHOLD;
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

      return this.retry(3, this.downloadLatestFile)
        .then((result)=>{
          filepath = result.filepath;
          comment = result.comment;
          
          return this.retryWithDelay(3, 1000, ()=>{
            return this.postMedia(filepath);
          }, this.tweetRetryHandler);
        })
        .then((mediaIdString)=>{
          // We will retry in the singular case of a 400 response from Twitter
          return this.retryWithDelay(3, 1000, () => {
            return this.updateStatus(mediaIdString, comment);
          }, this.tweetRetryHandler);
        })
        .then(()=>{
          const fileName = path.basename(filepath);
          console.log(`${this.screenName}: Tweeted file ${fileName}`);
          
          if (this.recordTweetEnabled) {
            return this.recordTweet(filepath, comment);
          }
          else {
            return Promise.resolve();
          }
        })
        .catch((err)=>{
          if (err && err.code === 'NoSuchKey') {
            console.log(`${this.screenName}: All download attempts failed.`);
          }
          else if (err && err.code === 130) {
            console.log(`${this.screenName}: Failed to tweet, Twitter is over capacity.`);
          }
          else {
            console.log(`${this.screenName}: An error occurred while attempting to tweet, failed filepath was ${filepath}`);
            console.log(err);
          }

          return Promise.resolve();
        })
        .finally(() => {
          return this.retryWithDelay(3, 1000, () => {
            return this.deleteRow(this.queueTable, 'filepath', filepath);
          });
        })
    };


    /* Follow back a user.
     * 1. Get all the followers
     * 2. Get records of sent follow requests
     * 3. Send follow request to new followers
     * 4. Record follower in table
     */
    this.follow = () => {
      var followerIds;
      var requestSentIds;
      var newFollowers = [];

      return this.getFollowerIds()
        .then((result)=>{
          followerIds = result;
         
          return this.getTableContents(this.requestSentTable);
        })
        .then((result)=>{
          requestSentIds = result.rows.map((row) => {
            return row.id;
          });
          
          for (const follower of followerIds) {
            if (!requestSentIds.includes(follower)) {
              newFollowers.push(follower);
            }
          }
         
          return this.lookupUsers(newFollowers);
        })
        .then((result)=>{
          return this.followOrBlockUsers(result);
        })
        .catch((err)=>{
          if (err && err[0].code === 17) {
            return Promise.each(newFollowers, (id)=>{
              console.log(`${this.screenName}: Could not follow ${id}, user no longer exists.`);
              return this.recordFollower(id, null);
            });
          }
          else {
            console.log(`${this.screenName}: An error occurred while attempting to follow users.`);
            console.log(err);
            return Promise.reject(err);
          }
        })
    };


    /* Unfollow a user who is no longer following us.
     * 1. Get all the friends
     * 2. Get all the followers
     * 3. Check which of our friends is no longer following
     * 4. Unfollow them
     * 5. Remove them from our records
     */
    this.unfollow = () => {
      var friendIds;
      var followerIds;
     
      return this.getFriendIds()
        .then((result)=>{
          friendIds = result;
         
          return this.getFollowerIds();
        })
        .then((result)=>{
          followerIds = result;
         
          const noLongerFollowing = [];
         
          for (const friend of friendIds) {
            if (!followerIds.includes(friend)) {
              noLongerFollowing.push(friend);
            }
          }
         
          return this.lookupUsers(noLongerFollowing);
        })
        .then((result)=>{
          return this.unfollowUsers(result);
        })
        .catch((err)=>{
          if (err && err[0].code === 17) {
            return Promise.each(newFollowers, (id)=>{
              console.log(`${this.screenName}: Could not unfollow ${id}, user no longer exists.`);
              return this.removeFollowRecord(id);
            });
          }
          else {
            console.log(`${this.screenName}: An error occurred while attempting to unfollow users.`);
            console.log(err);
            return Promise.reject();
          }
        })
    };


    /* Takes detailed list of users
     *
     * Attempt to follow all users on the list except for users suspected of
     * botting behaviour. Block these users instead.
     */
    this.followOrBlockUsers = (users) => {
      if (users.length > 0) {
        return Promise.each(users, (user) => {
          const screenName = user.screen_name;
          const id = user.id_str;

          if (user.friends_count < this.blockThreshold) {
            this.client.post('friendships/create', {user_id : id})
              .then(()=>{
                console.log(`${this.screenName}: Follow request sent to ${screenName}`);
                return this.recordFollower(id, screenName);
              })
              .catch((err)=>{
                console.log(`${this.screenName}: Failed to send follow request to ${screenName}`);
                
                if (err[0].code === 160) {
                  return this.recordFollower(id, screenName);
                }
                else {
                  console.log(err);
                  return Promise.resolve();
                }
              })
          }
          else if (this.blockEnabled) {
            this.client.post('blocks/create', {user_id : id})
              .then(()=>{
                console.log(`${this.screenName}: Blocked ${screenName}`);
                return Promise.resolve();
              })
              .catch(()=>{
                console.log(`${this.screenName}: Failed to block ${screenName}`);
                console.log(err);
                return Promise.resolve();
              })
          }
          else {
            // Over the threshold, but block is disabled
            return Promise.resolve();
          }
        })
      }
      else {
        return Promise.resolve(users);
      }
    };


    /* Takes detailed list of users
     *
     * Attempt to unfollow all users on the list.
     */
    this.unfollowUsers = (users) => {
      if (users.length > 0) {
        return Promise.each(users, (user) => {
          const screenName = user.screen_name;
          const id = user.id_str;

          this.client.post('friendships/destroy', {user_id : id})
            .then(()=>{
              console.log(`${this.screenName}: Unfollowed ${screenName}`);
              return this.removeFollowRecord(id);
            })
            .catch((err)=>{
              console.log(`${this.screenName}: Failed to unfollow ${screenName}`);
              console.log(err);
              return Promise.resolve();
            })
        })
      }
      else {
        return Promise.resolve(users);
      }
    };
    
    
    // Utility method that only calls enqueue if queue is empty
    this.enqueueWhenEmpty = () => {
      return this.countRows(this.queueTable)
        .then((result)=>{
          if (result === 0) {
            if (this.enqueueSmartEnabled) {
              return this.enqueueSmart();
            }
            else {
              return this.enqueue();
            }
          }
          else {
            return Promise.resolve();
          }
        })
    }


    /* Adds s3 filepaths to the queue table
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
      var recentMedia;
      var filePool;
     
      this.getRecentHistory(this.tweetHistoryTable)
        .then((result)=>{
          recentMedia = result.rows.map((row)=>{
            return row.filepath;
          });
         
          return this.listObjects();
        })
        .then((result)=>{
          filePool = result.Contents
            .filter((object)=>{
              return !object.Key.endsWith('/');
            })
            .map((object)=>{
              return object.Key;
            });
           
          const queue = this.generateQueue(filePool, recentMedia);
         
          return this.bulkInsert(queue.slice().reverse());
        })
        .catch((err)=>{
          console.log(`${this.screenName} : An error occurred while attempting to enqueue.`);
          console.log(err);
          return Promise.reject(err);
        })
    };
    
    /* Adds s3 filepaths to the queue table
     * 1. Retrieve list of objects with a specified prefix
     * 2. Generates a shuffled list
     * 3. Sequentially adds rows to the queue table
     *
     * Randomly shuffles all files in the pool without regard to recent post
     * history.
     */
    this.enqueue = () => {
      this.listObjects()
        .then((result)=>{
          const filePool = result.Contents
            .filter((object)=>{
              return !object.Key.endsWith('/');
            })
            .map((object)=>{
              return object.Key;
            });
           
          const queue = this.shuffleArray(filePool);
         
          return this.bulkInsert(queue.slice().reverse());
        })
        .catch((err)=>{
          console.log(`${this.screenName} : An error occurred while attempting to enqueue.`);
          console.log(err);
          return Promise.reject(err);
        })
    };


    /* Takes a file path and checks if it exists locally.
     * If not, attempts to download it from s3
     */
    this.downloadLatestFile = (filepath) => {
      var filepath;
      var comment;
      var fileExists;
      
      return this.getLatestRow(this.queueTable)
        .then((result)=>{
          filepath = result.rows[0].filepath;
          comment = result.rows[0].comment;

          return this.checkFileExists(filepath)
        })
        .then((result)=>{
          fileExists = result;

          if (fileExists) {
            return Promise.resolve({
              filepath: filepath,
              comment: comment
            });
          }
          else {
            return this.downloadFile(filepath)
              .then(()=>{
                return Promise.resolve({
                  filepath: filepath,
                  comment: comment
                });
              })
          }
        })
        .catch((err)=>{
          if (err && err.code === 'NoSuchKey') {
            console.log(`${this.screenName}: Could not download ${filepath}, the file does not exist in the bucket.`);
          }
          else {
            console.log(`${this.screenName} : An error occurred while attempting to download the latest file.`);
            console.log(err);
          }
          return this.deleteRow(this.queueTable, 'filepath', filepath)
            .then(()=>{
              return Promise.reject(err);
            })
        })
    };


    // Gets object data and writes to a file
    this.downloadFile = (filepath) => {
      return this.createDirectory(filepath)
        .then(()=>{
          return this.getObject(filepath);
        })
        .then((result)=>{
          return this.writeFile(filepath, result);
        })
    };
    
    
    // Chains all steps involved in posting media to Twitter
    this.postMedia = (filepath) => {
      var mediaIdString;
      
      return this.initUpload(filepath)
        .then((result)=>{
          mediaIdString = result.media_id_string;
          
          return this.appendUpload(filepath, mediaIdString);
        })
        .then(()=>{
          return this.finalizeUpload(mediaIdString);
        })
    }
    

    // Initializes upload by posting the filesize and filetype
    this.initUpload = (filepath) => {
      const mimeType = mime.lookup(filepath);

      return fs.statAsync(filepath)
        .then((stat)=>{
          return this.client.post('media/upload', {
            command : 'INIT',
            total_bytes : stat.size,
            media_type : mimeType,
          })
        })
    };


    // Posts chunks of the file in sequential order
    this.appendUpload = (filepath, mediaIdString) => {
      return fs.statAsync(filepath)
        .then((stat)=>{
          return new Promise((resolve, reject)=>{
            const finalChunkIndex = Math.floor(stat.size / CHUNK_SIZE);
            const readStream = fs.createReadStream(filepath, { highWaterMark: CHUNK_SIZE });

            var currentChunkIndex = 0;

            readStream.on('data', (chunk) => {
              readStream.pause();

              const payload = {
                command: 'APPEND',
                media_id: mediaIdString,
                media: chunk,
                segment_index: currentChunkIndex
              };

              this.client.post('media/upload', payload)
                .then(()=>{
                  if (currentChunkIndex === finalChunkIndex) {
                    resolve();
                  }
                  currentChunkIndex++;
                  readStream.resume();
                })
                .catch((err)=>{
                  console.log(`${this.screenName} : An error occurred while attempting to upload the file.`);
                  reject(err);
                })
            });
          })
        })
    };


    // Notifies Twitter that all chunks of the file has been uploaded
    this.finalizeUpload = (mediaIdString) => {
      return this.client.post('media/upload', {
        command: 'FINALIZE',
        media_id: mediaIdString
      })
      .then(()=>{
        return Promise.resolve(mediaIdString);
      })
    };


    // Post the tweet with media and comment
    this.updateStatus = (mediaIdString, comment) => {
      const payload = {
        status: comment,
        media_ids: mediaIdString
      };
     
      return this.client.post('statuses/update', payload);
    };


    // Create directories
    this.createDirectory = (filepath) => {
      const dirname = path.dirname(filepath);
      const mkdirp = Promise.promisify(require('mkdirp'));
     
      return mkdirp(dirname);
    };


    // Get file data from s3
    this.getObject = (filepath) => {
      const params = {
        Bucket: this.bucketName,
        Key: filepath
      };

      return s3.getObject(params).promise();
    };


    // Write data received from s3 into a file
    this.writeFile = (filepath, data) => {
      const savePath = path.resolve(__dirname, filepath);
      const file = fs.createWriteStream(savePath);

      return file.writeAsync(data.Body);
    };


    // Passes true if file exists, false if not
    this.checkFileExists = (filepath) => {
      return fs.statAsync(filepath)
        .then(()=>{
          return Promise.resolve(true);
        })
        .catch((err)=>{
          if (err.code == 'ENOENT') {
            return Promise.resolve(false);
          }
          else {
            console.log(`${this.screenName} : An error occurred while attempting to check if file exists.`);
            console.log(err);
            return Promise.reject(err);
          }
        })
    };


    // Lists objects with a specified prefix
    this.listObjects = () => {
      const s3 = new aws.S3();
      const params = {
        Bucket: this.bucketName,
        Prefix: this.bucketPrefix
      };

      return s3.listObjectsV2(params).promise();
    };


    // Durstenfeld Shuffle (taken from Stack Overflow)
    // http://stackoverflow.com/a/12646864
    this.shuffleArray = (array) => {
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


    // Get follower ids
    // Warning: this is rate limited
    this.getFollowerIds = () => {
      var ids = [];
     
      const task = (cursor) => {
        return this.client.get('followers/ids', {
          stringify_ids : true
        })
          .then((result)=>{
            ids = ids.concat(result.ids);
           
            if (result.next_cursor_str === '0') {
              return Promise.resolve(ids);
            }
            else {
              setTimeout(()=>{
                return task(result.next_cursor_str);
              }, 60000);
            }
          })
      };
      return task('-1');
    };


    // Get friend ids
    // Warning: this is rate limited
    this.getFriendIds = () => {
      var ids = [];
     
      const task = (cursor) => {
        return this.client.get('friends/ids', {
          stringify_ids : true
        })
          .then((result)=>{
            ids = ids.concat(result.ids);
           
            if (result.next_cursor_str === '0') {
              return Promise.resolve(ids)
            }
            else {
              setTimeout(()=>{
                return task(result.next_cursor_str);
              }, 60000)
            }
          })
      };
      return task('-1');
    };


    /* Returns detailed user information given a list of ids
     * userList is an array of user id strings
     * users/lookup takes a maximum of 100 comma separated ids
     *
     * Our use case is generally on very small lists, so it is unlikely
     * we will go over 100 ids at a time, but should userList exceed over
     * 100 values, the excess will not be included in the request
     */
    this.lookupUsers = (userList) => {
      if (userList.length > 0) {
        return this.client.post('users/lookup', {
          user_id : userList.slice(0, Math.min(100, userList.length)).join(',')
        });
      }
      else {
        return Promise.resolve([]);
      }
    };


    // Get the latest row from the queue
    this.getLatestRow = (tableName) => {
      const statement = `SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT 1`;
     
      return this.pool.query(statement);
    };


    // Delete a row from a table
    this.deleteRow = (tableName, column, value) => {
      const statement = `DELETE FROM ${tableName} WHERE ${column} = $1`;
     
      return this.pool.query(statement, [value]);
    };


    // Inserts rows one at time using a single client from the pool
    this.bulkInsert = (values) => {
      const statement = `INSERT INTO ${this.queueTable} (filepath, comment, timestamp) VALUES ($1, $2, $3)`;
      var pgClient;

      return this.pool.connect()
        .then(client => {
          pgClient = client;
          return Promise.each(values, (value) => {
            return client.query(statement, [value, null, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')])
              .catch((err) => {
                console.log(`${this.screenName}: Failed to insert ${value}`);
                Promise.resolve();
              })
          });
        })
        .then(()=>{
          pgClient.release();
          console.log(`${this.screenName}: File queue shuffled.`);
          return Promise.resolve();
        })
        .catch((err) => {
          console.log(`${this.screenName} : An error occurred while attempting to bulkInsert.`);
          return Promise.reject(err);
        })
    };


    // Records tweet data into history table
    this.recordTweet = (filepath, comment) => {
      const statement = `INSERT INTO ${this.tweetHistoryTable} (filepath, comment, timestamp) VALUES ($1, $2, $3)`;
     
      return this.pool.query(statement, [filepath, comment, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')]);
    };


    // Get recently posted media
    this.getRecentHistory = (tableName) => {
      const statement = `SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT ${this.recentLimit}`;
     
      return this.pool.query(statement);
    };


    // Count the number of rows in a table
    this.countRows = (tableName) => {
      const statement = `SELECT count(*) FROM ${tableName}`;
     
      return this.pool.query(statement)
        .then((result)=>{
          const count = result.rows[0].count;
          return Promise.resolve(parseInt(count));
        });
    };


    // Do not use if the table does not have timestamp field
    this.getTableContents = (tableName) => {
      const statement = `SELECT id FROM ${tableName} ORDER BY timestamp DESC`;
     
      return this.pool.query(statement);
    };


    // Add follower to table of sent requests
    this.recordFollower = (id, screenName) => {
      const statement = `INSERT INTO ${this.requestSentTable} (id, screen_name, timestamp) VALUES ($1, $2, $3)`;
     
      return this.pool.query(statement, [id, screenName, moment().utcOffset(0).format('YYYY-MM-DD HH:mm:ss.SSS')]);
    };


    // Removes follower records
    this.removeFollowRecord = (id) => {
      const statement = `DELETE FROM ${this.requestSentTable} WHERE id = $1`;
     
      return this.pool.query(statement, [id]);
    };


    // Wraps functions to make them retry on failure
    // func should return a promise!
    this.retry = (remainingRetries, func) => {
      return func()
        .catch((err) => {
          if (remainingRetries <= 0) {
            return Promise.reject(err);
          }
          return this.retry(remainingRetries - 1, func);
        });
    };
    
    /* Retries on failure, but with a delay between attempts
     * predicate is a function that takes error as an argument and returns true if it is safe to retry */
    this.retryWithDelay = (remainingRetries, interval, func, predicate) => {
      return func()
        .catch((err)=>{
          if (remainingRetries <= 0) {
            return Promise.reject(err);
          }
          else {
            if (predicate) {
              if (predicate(err)) {
                return Promise.delay(interval)
                  .then(()=>{
                    return this.retryWithDelay(remainingRetries - 1, interval, func, predicate);
                  })
              }
              else {
                return Promise.reject(err);
              }
            }
            else {
              return Promise.delay(interval)
                .then(()=>{
                  return this.retryWithDelay(remainingRetries - 1, interval, func, predicate);
                })
            }
            
          }
        })
    };

    this.tweetRetryHandler = err => {
      if (err && err.message && err.message.includes('400 Bad Request')) {
        console.log(`${this.screenName}: ${err.message} - Retrying...`);

        return true;
      }
      else {
        return false;
      }
    };
  }
};