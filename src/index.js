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
const { logger } = require('@adobe/openwhisk-action-logger');
const { expressify, wrap } = require('@adobe/openwhisk-action-utils');
const statusWrap = require('@adobe/helix-status').wrap;
const { epsagon } = require('@adobe/helix-epsagon');
const App = require('./app.js');

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
  .with(epsagon)
  .with(logger.trace)
  .with(logger)
  .with(statusWrap, {
    msgraphapi: 'https://graph.microsoft.com/v1.0',
  });
