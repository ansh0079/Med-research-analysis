'use strict';

// Public database module. The implementation lives in DatabaseCore plus
// domain mixins composed with collision checks in ./compose.

const { composeDatabase } = require('./compose');

const Database = composeDatabase();
const singleton = new Database(process.env.DATABASE_PATH || './database/app.db');

singleton.Database = Database;
singleton.composeDatabase = composeDatabase;

module.exports = singleton;
