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
  max: 20,
  idleTimeoutMillis: 3000
};

const pool = new Pool(poolConfig);

const idols = [
  'azusa', 'amimami', 'iori',
  'takane', 'chihaya', 'haruka',
  'hibiki', 'makoto', 'miki',
  'yayoi', 'yukiho', 'ritsuko'
]

function createTable(tableName, columns) {
  /* Create a table with the specified name and columns
   * 
   * columns is a array containing at least one string with column information.
   * At minimum, each string should have the name of the column followed by the
   * data type of the column.
   *
   * For example:
   *
   * createTable("user", ["id bigint", "name text"])
   *
   * will create a table named "user" with two fields called id and name, with the
   * data types bigint and text respectively.
   *
   * The user can specify constraints within the column string. Examples:
   *
   * "id bigint UNIQUE"
   * "name text PRIMARY KEY"
   * "lastname text NOT NULL"
   *
   * Refer to PostgreSQL documentation for a list of accepted data types and constraints.
   * It is the caller's responsibility to ensure that the column strings are formatted correctly!
   */
   
  if (columns.length === 0) {
    console.log("At least one column string required. Table not created.");
  }
  else {
    const statement = `CREATE TABLE ${tableName} (${columns.join()})`;
    
    return pool.query(statement)
      .then(result => {
        console.log(`Table ${tableName} successfully created.`);
      })
      .catch(err => {
        console.error(`Table ${tableName} could not be created.`);
        console.error(err);
      });
  }
   
   
}

// Drops the specified table from the database
function dropTable(tableName) {
  const statement = `DROP TABLE ${tableName}`;
  
  return pool.query(statement)
    .then(result => {
      console.log(`Table ${tableName} successfully dropped.`);
    })
    .catch(err => {
      console.error(`Table ${tableName} could not be dropped.`);
      console.error(err);
    });
}

// Creates a copy of a table
function copyTable(sourceTableName, destinationTableName) {
  const statement = `CREATE TABLE ${destinationTableName} AS TABLE ${sourceTableName}`;
  
  return pool.query(statement)
    .then(result => {
      console.log(`Table ${sourceTableName} successfully copied to ${destinationTableName}.`);
    })
    .catch(err => {
      console.error(`Table ${sourceTableName} could not be copied to ${destinationTableName}.`);
      console.error(err);
    });
}

// Delete all the rows in a table without dropping it
function clearTable(tableName) {
  const statement = `DELETE FROM ${tableName}`;
  
  return pool.query(statement)
    .then(result => {
      console.log(`Table ${tableName} successfully cleared.`);
    })
    .catch(err => {
      console.error(`Table ${tableName} could not be cleared.`);
      console.error(err);
    });
}

// Generic get all rows and columns of a table
function getTableContents(tableName) {
  const statement = `SELECT * FROM ${tableName}`;
  
  return pool.query(statement)
    .then(result => {
      return Promise.resolve(result.rows);
    })
}

// Get all the table names in the database
function getTableNames() {
  const statement = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name ASC";
  
  return pool.query(statement)
    .then(result => {
      return Promise.resolve(result.rows);
    })
}

// Updates the file_counter table with a new source
function addSourceCounter(sourceName) {
  const rows = [];
  
  for (const idol of idols) {
    rows.push(`(\'${idol}\', \'${sourceName}\', 0)`);
  }
  
  const statement = `INSERT INTO file_counter (idol, source, counter) VALUES ${rows.join()}`;
  
  return pool.query(statement)
    .then(result => {
      console.log(`Source ${sourceName} successfully added.`);
    })
    .catch(err => {
      console.error(`Table ${sourceName} could not be added.`);
      console.error(err);
    });
}

// Set the counter for a specific idol/source
function setCounter(idol, source, counter) {
  const statement = `UPDATE file_counter SET counter = ${counter} WHERE idol = \'${idol}\' AND source = \'${source}\'`;
  
  return pool.query(statement)
    .then(result => {
      console.log(`Counter for ${idol}/${source} successfully set to ${counter}.`);
    })
    .catch(err => {
      console.error(`Counter for ${idol}/${source} could not be set.`);
      console.error(err);
    });
}