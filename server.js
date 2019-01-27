// imas765probot web server
require('newrelic'); // new relic monitoring

const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const favicons = require('connect-favicons');
const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'production') {
  // Step 1: Create & configure a webpack compiler
  const webpack = require('webpack');
  const webpackConfig = require('./webpack.config');
  const compiler = webpack(webpackConfig);

  // Step 2: Attach the dev middleware to the compiler & the server
  app.use(require("webpack-dev-middleware")(compiler, {
    noInfo: true, publicPath: webpackConfig.output.publicPath
  }));

  // Step 3: Attach the hot middleware to the compiler & the server
  app.use(require("webpack-hot-middleware")(compiler, {
    log: console.log, path: '/__webpack_hmr', heartbeat: 10 * 1000
  }));
}

app.use(express.static(path.join(__dirname, 'dist')));
app.use(favicons(__dirname + '/src/images/icons'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

require('./src/routes')(app);

app.get('*', function(request, response) {
  response.sendFile(__dirname + '/dist/index.html')
});

app.listen(PORT, function(error) {
  if (error) {
    console.log(error);
  } else {
    console.log('imas765probot web server started.');
  }
});
