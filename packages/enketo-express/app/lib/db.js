const redis = require('redis');
const config = require('../models/config-model').server;

const mainClient = redis.createClient(config.redis.main.url);
const cacheClient = redis.createClient(config.redis.cache.url);

module.exports = {
    mainClient,
    cacheClient,
};
