/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const crypto = require('crypto');
const fs = require('fs');
const { logger } = require('@adobe/openwhisk-action-logger');
const { expressify, wrap } = require('@adobe/openwhisk-action-utils');
const statusWrap = require('@adobe/helix-status').wrap;
const { epsagon } = require('@adobe/helix-epsagon');
const App = require('./app.js');

// todo: move to helix-status?
let numInvocations = 0;
const startTime = Date.now();
const uuid = crypto.randomBytes(16).toString('hex');
const runningActivations = new Set();

function logActionStatus(action) {
  return async (params) => {
    const { __ow_logger: lg } = params;
    const numFileHandles = await new Promise((resolve) => {
      fs.readdir('/proc/self/fd', (err, list) => {
        if (err) {
          lg.info(`unable to read /proc/self/fd: ${err.message}`);
          resolve(-1);
        } else {
          resolve(list.length);
        }
      });
    });
    const memInfo = process.memoryUsage().rss;
    const age = Date.now() - startTime;
    numInvocations += 1;
    // eslint-disable-next-line no-underscore-dangle
    const activationId = process.env.__OW_ACTIVATION_ID;
    runningActivations.add(activationId);
    lg.infoFields('action-status', {
      status: {
        numInvocations,
        memInfo,
        age,
        numFileHandles,
        uuid,
        concurrency: runningActivations.size,
      },
    });
    try {
      return await action(params);
    } finally {
      runningActivations.delete(activationId);
    }
  };
}

/**
 * Main function
 * @param params Action params
 * @returns {Promise<*>} The response
 */
async function run(params) {
  // eslint-disable-next-line no-underscore-dangle
  const app = App(params);
  return expressify(app)(params);
}

/**
 * Main function called by the openwhisk invoker.
 * @param params Action params
 * @returns {Promise<*>} The response
 */
module.exports.main = wrap(run)
  .with(logActionStatus)
  .with(epsagon, {
    ignoredKeys: [
      /^[A-Z][A-Z0-9_]+$/,
      '__ow_headers',
      '__ow_body',
      '__ow_logger',
      /authorization/i,
    ],
  })
  .with(logger.trace)
  .with(logger)
  .with(statusWrap, {
    msgraphapi: 'https://graph.microsoft.com/v1.0',
  });
