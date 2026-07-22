process.env.NODE_ENV = 'test';
process.env.APP_ROLE = 'web';
process.env.E2E_SERVE_STATIC = 'true';

const { startServer } = require('../server');

startServer();
