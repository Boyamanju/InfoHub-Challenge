// api/index.js
const serverless = require('serverless-http');
const app = require('../server/server.js');
module.exports = serverless(app);
