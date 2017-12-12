// imas765probot 2.0

if (JSON.parse(process.env.BOT_ENABLED)) {
  console.log('imas765probot 2.0 started.');

  const Promise = require('bluebird');
  const path = require('path');
  const TwitterBot = require(path.resolve( __dirname, "./bot.js" ));

  // Load configuration from environment variables
  const TWEET_OFFSET = parseInt(process.env.TWEET_OFFSET);
  const FOLLOW_OFFSET = parseInt(process.env.FOLLOW_OFFSET);
  const UNFOLLOW_OFFSET = parseInt(process.env.UNFOLLOW_OFFSET);
  const PRELOAD_OFFSET = parseInt(process.env.PRELOAD_OFFSET);
  const ENQUEUE_OFFSET = parseInt(process.env.ENQUEUE_OFFSET);
  
  const TWEET_INTERVAL = parseInt(process.env.TWEET_INTERVAL);
  const FOLLOW_INTERVAL = parseInt(process.env.FOLLOW_INTERVAL);
  const UNFOLLOW_INTERVAL = parseInt(process.env.UNFOLLOW_INTERVAL);
  const PRELOAD_INTERVAL = parseInt(process.env.PRELOAD_INTERVAL);
  const ENQUEUE_INTERVAL = parseInt(process.env.ENQUEUE_INTERVAL);

  const TWEET_INITIAL_DELAY = parseInt(process.env.TWEET_INITIAL_DELAY);
  const FOLLOW_INITIAL_DELAY = parseInt(process.env.FOLLOW_INITIAL_DELAY);
  const UNFOLLOW_INITIAL_DELAY = parseInt(process.env.UNFOLLOW_INITIAL_DELAY);
  const PRELOAD_INITIAL_DELAY = parseInt(process.env.PRELOAD_INITIAL_DELAY);
  const ENQUEUE_INITIAL_DELAY = parseInt(process.env.ENQUEUE_INITIAL_DELAY);
  
  // Load individual configuration for each bot
  const makomakorin_bot = JSON.parse(process.env.makomakorin_bot);
  const harurun_bot_ = JSON.parse(process.env.harurun_bot_);
  const chiichan_bot = JSON.parse(process.env.chiichan_bot);
  const yayoicchi_bot = JSON.parse(process.env.yayoicchi_bot);
  const iorin_bot_ = JSON.parse(process.env.iorin_bot_);
  const amimami_bot = JSON.parse(process.env.amimami_bot);
  const yukipyon_bot = JSON.parse(process.env.yukipyon_bot);
  const ohimechin_bot = JSON.parse(process.env.ohimechin_bot);
  const mikimiki_bot_ = JSON.parse(process.env.mikimiki_bot_);
  const hibikin_bot_ = JSON.parse(process.env.hibikin_bot_);
  const azusasan_bot = JSON.parse(process.env.azusasan_bot);
  const ricchan_bot_ = JSON.parse(process.env.ricchan_bot_);
  
  // Backup accounts
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
  const ricchan_bot3 = JSON.parse(process.env.ricchan_bot3);

  // Create bots using configuration
  // const bots = [
    // new TwitterBot(makomakorin_bot),
    // new TwitterBot(harurun_bot_),
    // new TwitterBot(chiichan_bot),
    // new TwitterBot(yayoicchi_bot),
    // new TwitterBot(iorin_bot_),
    // new TwitterBot(amimami_bot),
    // new TwitterBot(yukipyon_bot),
    // new TwitterBot(ohimechin_bot),
    // new TwitterBot(mikimiki_bot_),
    // new TwitterBot(hibikin_bot_),
    // new TwitterBot(azusasan_bot),
    // new TwitterBot(ricchan_bot_)
  // ];
  
  
  // Backup accounts
  const bots = [
    new TwitterBot(makorin_bot2),
    new TwitterBot(harurun_bot2),
    new TwitterBot(chiichan_bot2),
    new TwitterBot(yayoicchi_bot2),
    new TwitterBot(iorin_bot2),
    new TwitterBot(amimami_bot4),
    new TwitterBot(yukipyon_bot3),
    new TwitterBot(ohimechin_bot2),
    new TwitterBot(mikimiki_bot3),
    new TwitterBot(hibikin_bot3),
    new TwitterBot(azusasan_bot),
    new TwitterBot(ricchan_bot3)
  ]
  
  
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
    return Promise.delay(delay)
      .then(()=>{
        const date = new Date();
        const minute = date.getMinutes();
        
        if (minute % interval === offset) {
          return task()
            .then(()=>{
              return taskLoop(task, offset, interval, getLoopDelay());
            })
            .catch((err)=>{
              return taskLoop(task, offset, interval, getLoopDelay());
            })
        }
        else {
          return taskLoop(task, offset, interval, getLoopDelay());
        }
      })
      .catch((err)=>{
        return taskLoop(task, offset, interval, getLoopDelay());
      })
  }


  for (const bot of bots) {
    if (bot.tweetEnabled) {
      taskLoop(bot.tweet, TWEET_OFFSET, TWEET_INTERVAL, TWEET_INITIAL_DELAY);
    }
    if (bot.followEnabled) {
      taskLoop(bot.follow, FOLLOW_OFFSET, FOLLOW_INTERVAL, FOLLOW_INITIAL_DELAY);
    }
    if (bot.unfollowEnabled) {
      taskLoop(bot.unfollow, UNFOLLOW_OFFSET, UNFOLLOW_INTERVAL, UNFOLLOW_INITIAL_DELAY);
    }
    if (bot.preloadEnabled) {
      taskLoop(bot.downloadLatestFile, PRELOAD_OFFSET, PRELOAD_INTERVAL, PRELOAD_INITIAL_DELAY);
    }

    taskLoop(bot.enqueueWhenEmpty, ENQUEUE_OFFSET, ENQUEUE_INTERVAL, ENQUEUE_INITIAL_DELAY);
  }
}
else {
  console.log('imas765probot 2.0 not enabled. Ending process.');
}