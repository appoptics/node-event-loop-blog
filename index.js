'use strict';

/* eslint-disable no-console */

const ao = require('appoptics-apm'); // eslint-disable-line
const Express = require('express');
const crypto = require('crypto');
const Metrics = require('./lib/metrics');

// how many times to fill the buffer and how big the buffer is
const kFillCount = 100;
const kBufferSize = 10000000;

// insert your access token here
if (!process.env.APPOPTICS_SERVICE_KEY) {
  console.log('? ERROR: environment variable APPOPTICS_SERVICE_KEY not found');
  console.log('please either define it or define it in the code');
  process.exit(1);
}
const [token] = process.env.APPOPTICS_SERVICE_KEY.split(':');
const tags = {service: 'event-loop-blog'};
const metrics = new Metrics(token, tags);

const app = new Express();

//
// stats we'll collect on the application's activities
//
let syncCount = 0;
let syncTime = 0;
let asyncCount = 0;
let asyncTime = 0;
let eventCount = 0;
let eventTotalDelay = 0;

//
// the synchronous endpoint
//
app.get('/sync', function sync (req, res) {
  const startTime = process.hrtime();
  const buffer = Buffer.alloc(kBufferSize);

  for (let i = 0; i < kFillCount; i++) {
    crypto.randomFillSync(buffer);
  }
  const delta = process.hrtime(startTime);
  const seconds = delta[0] + delta[1] / 1e9;
  syncCount += 1;
  syncTime += seconds;
  res.json({status: true, seconds});
});

//
// the asynchronous endpoint
//
app.get('/async', function async (req, res) {
  const startTime = process.hrtime();
  const buffer = Buffer.alloc(kBufferSize);
  let count = 0;

  function fillBuffer () {
    crypto.randomFill(buffer, function () {
      if (count++ >= kFillCount) {
        const delta = process.hrtime(startTime);
        const seconds = delta[0] + delta[1] / 1e9;
        asyncCount += 1;
        asyncTime += seconds;
        res.json({status: true, seconds});
        return;
      }
      fillBuffer();
    });
  }

  fillBuffer();
});

app.get('/', function home (req, res) {
  res.send('try /sync or /async\n');
});

app.use(function (req, res) {
  res.status(404);
  res.send('page not found\n');
});

app.listen(8888, 'localhost')
  .on('listening', function () {
    console.log('listening on localhost:8888');
  })
  .on('error', function (e) {
    console.log('error starting server', e);
    process.exit(1);
  });

//
// send metrics on "work" every 10 seconds.
//
const {promise} = metrics.sendOnInterval(10 * 1e3, function () {
  const stats = getStats();
  const metrics = {
    'eventloop-blog.timeoutEventCount': stats.timeoutEventCount,
    'eventloop-blog.timeoutAverageDelayMs': stats.timeoutAverageDelay,
    'eventloop-blog.syncCount': stats.syncCount,
    'eventloop-blog.syncAverageSeconds': stats.syncAverageSeconds,
    'eventloop-blog.asyncCount': stats.asyncCount,
    'eventloop-blog.asyncAverageSeconds': stats.asyncAverageSeconds,
  }
  return {metrics};
})

promise.catch(e => {
  console.log('? ERROR sending metrics', e);
  process.exit(1);
})

//
// pretend work we're trying to do with our timeout
//

let previousTime = process.hrtime();
// eslint-disable-next-line no-unused-vars
const iid = setInterval(function () {
  eventCount += 1;
  const deltaTime = process.hrtime(previousTime);
  // convert to milliseconds
  eventTotalDelay += deltaTime[0] * 1e3 + deltaTime[1] / 1e6;
  previousTime = process.hrtime();
}, 250);

//
// application performance: calculate averages and clear
// statistics each interval.
//
function getStats () {
  const stats = {
    timeoutEventCount: eventCount,
    timeoutAverageDelay: eventTotalDelay / eventCount,
    syncCount,
    syncAverageSeconds: syncCount ? syncTime / syncCount : 0,
    asyncCount,
    asyncAverageSeconds: asyncCount ? asyncTime / asyncCount : 0,
  };

  // each interval starts with clean stats
  syncCount = 0;
  syncTime = 0;
  asyncCount = 0;
  asyncTime = 0;
  eventCount = 0;
  eventTotalDelay = 0;

  return stats;
}
