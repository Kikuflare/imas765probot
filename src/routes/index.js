// Create common resources and define routes with route handlers

// Dropbox API
const fetch = require('isomorphic-fetch');
const Dropbox = require('dropbox').Dropbox;
const dbx = new Dropbox({accessToken: process.env.DROPBOX_ACCESS_TOKEN, fetch: fetch});

// Middleware
const isAuthenticated = require('../middleware/isAuthenticated');

// Passport authentication
const passport = require('passport');
const Strategy = require('passport-twitter').Strategy;
const trustProxy = process.env.DYNO ? true : false;

passport.use(new Strategy({
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
  callbackURL: '/oauth/callback',
  proxy: trustProxy
}, (token, tokenSecret, profile, cb) => {
  return cb(null, profile);
}));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


module.exports = (app, pool) => {
  // Objects containing route handlers
  const uploadRouteHandler = new (require('./routeHandlers/UploadRouteHandler'))(pool, dbx);
  const uploadLogRouteHandler = new (require('./routeHandlers/UploadLogRouteHandler'))(pool);
  const adminRouteHandler = new (require('./routeHandlers/AdminRouteHandler'))(pool, dbx);
  const authenticationRouteHandler = new (require('./routeHandlers/AuthenticationRouteHandler'))(pool);

  app.use(passport.initialize());

  // Upload routes
  app.post('/api/post-comment', uploadRouteHandler.postComment);
  app.get('/api/get-signed-url', uploadRouteHandler.getSignedURL);

  // Upload Log routes
  app.get('/api/get-upload-logs', uploadLogRouteHandler.getUploadLogs);
  
  // Authentication routes
  app.get('/api/login', passport.authenticate('twitter'));
  app.get('/oauth/callback', passport.authenticate('twitter', { failureRedirect: '/'}), authenticationRouteHandler.login);
  
  // Admin routes
  app.post('/api/enqueue', isAuthenticated('admin'), adminRouteHandler.enqueue);
  app.get('/api/get-uploads', isAuthenticated('admin'), adminRouteHandler.getUploads);
  app.get('/api/get-image-url', isAuthenticated('admin'), adminRouteHandler.getImageURL);
  app.post('/api/reject-upload', isAuthenticated('admin'), adminRouteHandler.rejectUpload);
  app.post('/api/delete-upload', isAuthenticated('admin'), adminRouteHandler.deleteUpload);
  app.post('/api/accept-upload', isAuthenticated('admin'), adminRouteHandler.acceptUpload);
  app.get('/api/get-queue', isAuthenticated('admin'), adminRouteHandler.getQueue);
  app.post('/api/dequeue-file', isAuthenticated('admin'), adminRouteHandler.dequeueFile);
};