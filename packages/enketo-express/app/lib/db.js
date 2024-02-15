const redis = require('redis');
const config = require('../models/config-model').server;

const mainClient = redis.createClient(
    config.redis.main.port,
    config.redis.main.host,
    {
        auth_pass: config.redis.main.password,
        db: config.redis.main?.db || 0,
    }
);

const cacheClient = redis.createClient(
    config.redis.cache.port,
    config.redis.cache.host,
    {
        auth_pass: config.redis.cache.password,
        db: config.redis.cache?.db || 0,
    }
);

module.exports = {
    mainClient,
    cacheClient,
};
