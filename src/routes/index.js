// Create common resources and define routes with route handlers

// Postgres pool
const pool = require('./pgConfig');

// AWS API
const aws = require('aws-sdk');
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-west-2',
  signatureVersion: 'v4'
});
aws.config.setPromisesDependency(Promise);
const s3 = new aws.S3();

// Middleware
const isAuthenticated = require('../middleware/isAuthenticated');


// Objects containing route handlers
const uploadRouteHandler = new (require('./routeHandlers/UploadRouteHandler'))(pool, s3);
const adminRouteHandler = new (require('./routeHandlers/AdminRouteHandler'))(pool, s3);
const authenticationRouteHandler = new (require('./routeHandlers/AuthenticationRouteHandler'))(pool);


module.exports = function (app) {

  // Upload routes
  app.post('/api/post-comment', uploadRouteHandler.postComment);
  app.get('/api/get-signed-url', uploadRouteHandler.getSignedURL);
  
  // Authentication routes
  app.post('/api/login', authenticationRouteHandler.login);
  // app.post('/api/register', authenticationRouteHandler.register);
  
  // Admin routes
  app.post('/api/update-table', isAuthenticated('admin'), adminRouteHandler.updateQueue);
  app.get('/api/get-uploads', isAuthenticated('admin'), adminRouteHandler.getUploads);
  app.get('/api/get-objects', isAuthenticated('admin'), adminRouteHandler.getObjects);
  app.get('/api/get-image-url', isAuthenticated('admin'), adminRouteHandler.getImageURL);
  app.post('/api/reject-upload', isAuthenticated('admin'), adminRouteHandler.rejectUpload);
  app.post('/api/delete-upload', isAuthenticated('admin'), adminRouteHandler.deleteUpload);
  app.post('/api/accept-upload', isAuthenticated('admin'), adminRouteHandler.acceptUpload);
  
}