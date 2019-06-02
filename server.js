const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const app = express();
const path = require('path');
const favicon = require('serve-favicon')
const PORT = process.env.PORT || 8080;

// Postgres pool
const pool = require('./src/db/pgConfig.js');

if (process.env.NODE_ENV !== 'production') {
  const webpack = require('webpack');
  const webpackConfig = require('./webpack.config.js');
  const compiler = webpack(webpackConfig);
  const webpackDevMiddleware = require("webpack-dev-middleware");
  const webpackHotMiddleware = require("webpack-hot-middleware");

  app.use(webpackDevMiddleware(compiler, {
    noInfo: true, publicPath: webpackConfig.output.publicPath
  }));

  app.use(webpackHotMiddleware(compiler, {
    log: console.log, path: '/__webpack_hmr', heartbeat: 10 * 1000, reload: true
  }));
}

app.use(session({
  store: new pgSession({
    pool : pool,
    tableName : 'session'
  }),
  secret: process.env.API_SECRET,
  resave: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  saveUninitialized: false
}));

app.use(express.static('dist'));
app.use(express.json());
app.use(favicon(path.join(__dirname, 'src/images/', 'favicon.ico')));


// Attach route handlers
require('./src/routes')(app, pool);

app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, './dist/index.html')));

app.listen(PORT, error => {
  if (error) {
    console.log(error);
  }
  else {
    console.log('imas765probot web server started.');
  }
});