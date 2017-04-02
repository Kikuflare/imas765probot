# imas765probot-v2
Version 2.0 of [imas765probot](https://github.com/Kikugumo/imas765probot) on Node.js

The following Twitter image bots currently run on Heroku using this code.

https://twitter.com/makomakorin_bot  
https://twitter.com/harurun_bot_  
https://twitter.com/chihaya_bot_  
https://twitter.com/yayoicchi_bot  
https://twitter.com/iorin_bot_  
https://twitter.com/amimami_bot  
https://twitter.com/yukipyon_bot  
https://twitter.com/ohimechin_bot  
https://twitter.com/mikimiki_bot_  
https://twitter.com/hibikin_bot_  
https://twitter.com/azusa_bot__  
https://twitter.com/ricchan_bot_  

#### Why the change from Python 3 to Node.js?
v1 used a forked version of the tweepy library to access the Twitter API, but due to some issues with uploading large video files, I made the decision to move to another platform with a better Twitter library. At this time, the [imas765probot web app](https://imas765probot.herokuapp.com) had already been in production for several months using a Node.js backend, so it was a natural decision to port imas765probot to the Node.js platform.

Should be obvious, but `bot.js` and `imas765probot.js` in v2 correspond to `bot.py` and `imas765probot.py` respectively in v1. API keys are now stored in environment variables instead of a config file.

Feel free to send me feedback, suggestions, or bug reports [@Kikugumo](https://twitter.com/Kikugumo)