const environment = process.env.NODE_ENV || 'local';
const config = require('./../knexfile.js')[environment];
module.exports = require('knex')(config);