// imas765probot 2.0

if (JSON.parse(process.env.BOT_ENABLED)) {
  console.log('imas765probot 2.0 started.');

  const Promise = require('bluebird');
  const path = require('path');
  const TwitterBot = require(path.resolve( __dirname, "./bot.js" ));

  // Load configuration from environment variables
  const TWEET_OFFSET = parseInt(process.env.TWEET_OFFSET);
  const PRELOAD_OFFSET = parseInt(process.env.PRELOAD_OFFSET);
  const ENQUEUE_OFFSET = parseInt(process.env.ENQUEUE_OFFSET);
  
  const TWEET_INTERVAL = parseInt(process.env.TWEET_INTERVAL);
  const PRELOAD_INTERVAL = parseInt(process.env.PRELOAD_INTERVAL);
  const ENQUEUE_INTERVAL = parseInt(process.env.ENQUEUE_INTERVAL);

  const TWEET_INITIAL_DELAY = parseInt(process.env.TWEET_INITIAL_DELAY);
  const PRELOAD_INITIAL_DELAY = parseInt(process.env.PRELOAD_INITIAL_DELAY);
  const ENQUEUE_INITIAL_DELAY = parseInt(process.env.ENQUEUE_INITIAL_DELAY);

  const PRELOAD_ENABLED = JSON.parse(process.env.PRELOAD_ENABLED);

  // Instantiate an instance of a connection pool for postgres and share it with all the bots
  const Pool = require('pg-pool');
  const url = require('url');
  const databaseParams = url.parse(process.env.DATABASE_URL);
  const auth = databaseParams.auth.split(':');
  const poolConfig = {
    user: auth[0],
    password: auth[1],
    host: databaseParams.hostname,
    port: databaseParams.port,
    database: databaseParams.pathname.split('/')[1],
    ssl: true,
    max: 4,
    idleTimeoutMillis: 10000
  };
  const pool = new Pool(poolConfig);

  // Get configuration for the bots from the environment variables
  const makorin_bot2 = JSON.parse(process.env.makorin_bot2);
  const harurun_bot2 = JSON.parse(process.env.harurun_bot2);
  const chiichan_bot2 = JSON.parse(process.env.chiichan_bot2);
  const yayoicchi_bot2 = JSON.parse(process.env.yayoicchi_bot2);
  const iorin_bot2 = JSON.parse(process.env.iorin_bot2);
  const amimami_bot4 = JSON.parse(process.env.amimami_bot4);
  const yukipyon_bot3 = JSON.parse(process.env.yukipyon_bot3);
  const ohimechin_bot2 = JSON.parse(process.env.ohimechin_bot2);
  const mikimiki_bot3 = JSON.parse(process.env.mikimiki_bot3);
  const hibikin_bot3 = JSON.parse(process.env.hibikin_bot3);
  const azusasan_bot = JSON.parse(process.env.azusasan_bot);
  const ricchan_bot3 = JSON.parse(process.env.ricchan_bot3);

  // Create instances of the bots
  const bots = [
    new TwitterBot(makorin_bot2, pool),
    new TwitterBot(harurun_bot2, pool),
    new TwitterBot(chiichan_bot2, pool),
    new TwitterBot(yayoicchi_bot2, pool),
    new TwitterBot(iorin_bot2, pool),
    new TwitterBot(amimami_bot4, pool),
    new TwitterBot(yukipyon_bot3, pool),
    new TwitterBot(ohimechin_bot2, pool),
    new TwitterBot(mikimiki_bot3, pool),
    new TwitterBot(hibikin_bot3, pool),
    new TwitterBot(azusasan_bot, pool),
    new TwitterBot(ricchan_bot3, pool)
  ];

  // Returns the remaining milliseconds until the next 0 second
  const getLoopDelay = () => {
    const date = new Date();
    return 60000 - date.getSeconds() * 1000 - date.getMilliseconds();
  };

  /* task: function to be executed
   * offset: minute of the hour task will execute
   * interval: minutes between task execution
   * delay: milliseconds between task loop execution
   */
  const taskLoop = (task, offset, interval, delay) => {
    return Promise.delay(delay + 100) // adding a small additional delay to ensure there is no double post
      .then(() => {
        const date = new Date();
        const minute = date.getMinutes();
        
        if (minute % interval === offset) {
          return task()
            .then(() => taskLoop(task, offset, interval, getLoopDelay()))
            .catch(err => {
              if (err && err.response && err.response.status === 409) {
                // Ignore this
              }
              else {
                return taskLoop(task, offset, interval, getLoopDelay());
              }
            });
        }
        else {
          return taskLoop(task, offset, interval, getLoopDelay());
        }
      })
      .catch(err => taskLoop(task, offset, interval, getLoopDelay()));
  }

  // Start execution loop for various tasks
  for (const bot of bots) {
    if (bot.tweetEnabled) {
      taskLoop(bot.tweet, TWEET_OFFSET, TWEET_INTERVAL, TWEET_INITIAL_DELAY);
    }
    if (PRELOAD_ENABLED) {
      taskLoop(bot.downloadLatestFile, PRELOAD_OFFSET, PRELOAD_INTERVAL, PRELOAD_INITIAL_DELAY);
    }

    taskLoop(bot.enqueueWhenEmpty, ENQUEUE_OFFSET, ENQUEUE_INTERVAL, ENQUEUE_INITIAL_DELAY);
  }
}
else {
  console.log('imas765probot 2.0 not enabled. Ending process.');
}