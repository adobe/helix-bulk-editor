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

/* eslint-disable no-console,no-param-reassign */
const {
  logRequest, errorHandler, asyncHandler, cacheControl, createBunyanLogger,
} = require('@adobe/openwhisk-action-utils');

const express = require('express');
const cookieParser = require('cookie-parser');
const pkgJson = require('../package.json');

const rp = require('request-promise-native');
const { OneDrive } = require('@adobe/helix-onedrive-support');

class MyOneDrive extends OneDrive {
  constructor(req) {
    super({
      clientId: 'xxx',
      clientSecret: 'xxx',
      log: req.log,
    });

    if (req.headers['x-ms-access-token']) {
      this.token = req.headers['x-ms-access-token'];
      return;
    }

    // console.log(req);
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      const err = Error('no authorization header');
      err.statusCode = 401;
      throw err;
    }

    // eslint-disable-next-line prefer-destructuring
    this.token = req.headers.authorization.split(' ')[1];
    // console.log(this.token);
  }

  async getAccessToken() {
    return this.token;
  }
}

async function getDriveItem(url) {
  // todo: parse better
  const [, , driveId, , id] = url.split('/');
  return {
    id,
    parentReference: {
      driveId,
    },
  };
}

/**
 * Handles 'GET /'
 */
async function indexHandler(req, res) {
  res
    .set('content-type', 'text/plain')
    .send('hello');
}

/**
 * Handles 'GET /api'
 */
async function apiHandler(req, res) {
  res
    .set('content-type', 'application/json')
    .json({
      title: 'hello, world',
    });
}

/**
 * Handles 'GET /api/me'
 */
async function apiMeHandler(req, res) {
  try {
    const od = new MyOneDrive(req);
    const me = await od.me();
    console.log(me);
    res
      .set('content-type', 'application/json')
      .json(me);
  } catch (e) {
    console.log(e);
    res.status(e.statusCode || 500);
    res.send('error');
  }
}

/**
 * Handles 'GET /api/list'
 */
async function apiListHandler(req, res) {
  try {
    let { root } = req.query;
    if (!root) {
      res
        .set('content-type', 'application/json')
        .json([]);
      return;
    }
    const od = new MyOneDrive(req);
    if (root.startsWith('https://')) {
      // assume share link
      const result = await od.getDriveItemFromShareLink(root);
      const { id } = result;
      const { driveId } = result.parentReference;
      root = `/drives/${driveId}/items/${id}`;
    }
    const rootFolder = await getDriveItem(root);
    const result = await od.listChildren(rootFolder, '');

    // console.log(result);
    const value = result.value.map((item) => ({
      name: item.name,
      itemId: `/drives/${item.parentReference.driveId}/items/${item.id}`,
    }));
    res
      .set('content-type', 'application/json')
      .json(value);
  } catch (e) {
    console.log(e);
    res.status(e.statusCode || 500);
    res.send('error');
  }
}

/**
 * Handles 'GET /ping'
 */
async function pingHandler(req, res) {
  res
    .set('content-type', 'text/plain')
    .send('PONG');
}

function createApp(params) {
  const { __ow_logger: owLogger = {} } = params;
  const log = createBunyanLogger(owLogger.logger);
  const app = express();

  app.use(logRequest(log));
  app.use(cookieParser());
  app.use(cacheControl());
  // app.use(express.static('static'));
  app.use(express.json());

  app.locals.pkgJson = pkgJson;

  // app.get('/', asyncHandler(indexHandler));
  app.get('/ping', asyncHandler(pingHandler));
  app.get('/api', asyncHandler(apiHandler));
  app.get('/api/me', asyncHandler(apiMeHandler));
  app.get('/api/list', asyncHandler(apiListHandler));

  app.use(errorHandler(log));

  return app;
}

module.exports = createApp;
