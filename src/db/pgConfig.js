const Pool = require('pg-pool');

const url = require('url');
const params = url.parse(process.env.DATABASE_URL);
const auth = params.auth.split(':');

const poolConfig = {
  Promise: require('bluebird'),
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true,
  max: 1,
  idleTimeoutMillis: 60000
};

module.exports = new Pool(poolConfig);