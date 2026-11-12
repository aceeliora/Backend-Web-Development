'use strict';

const rateLimit = require('express-rate-limit');

// In a multi-instance deployment, replace the default in-memory store with a
// RedisStore from `rate-limit-redis`, configured to send commands to shared Redis.
// Each process's memory store has its own counter, so a load balancer can spread
// requests across instances and effectively multiply the per-IP limit. Redis
// gives every instance one shared counter and enforces the limit across the fleet.
module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});
