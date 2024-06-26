const redis = require('redis');
const config = require('../models/config-model').server;

const mainClient = config.redis.main.url
    ? redis.createClient(config.redis.main.url)
    : redis.createClient(config.redis.main.port, config.redis.main.host, {
          auth_pass: config.redis.main.password,
      });

const cacheClient = config.redis.cache.url
    ? redis.createClient(config.redis.cache.url)
    : redis.createClient(config.redis.cache.port, config.redis.cache.host, {
          auth_pass: config.redis.cache.password,
      });

module.exports = {
    mainClient,
    cacheClient,
};
