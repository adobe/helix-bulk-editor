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
const path = require('path').posix;
const {
  logRequest, errorHandler, asyncHandler, cacheControl, createBunyanLogger,
} = require('@adobe/openwhisk-action-utils');
const { OneDrive } = require('@adobe/helix-onedrive-support');
const express = require('express');
const cookieParser = require('cookie-parser');
const pkgJson = require('../package.json');

const { extractFields, updateMarkdown } = require('./editor.js');

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
  }

  async getAccessToken() {
    return this.token;
  }
}

function pathToDriveItem(url) {
  // todo: parse better
  const [, , driveId, , id] = url.split('/');
  return {
    id,
    name: '',
    parentReference: {
      driveId,
    },
  };
}

function driveItemToPath(driveItem) {
  return `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}`;
}


async function processQueue(queue, fn, maxConcurrent = 100) {
  const running = [];
  const results = [];
  while (queue.length || running.length) {
    if (running.length < maxConcurrent && queue.length) {
      const task = fn(queue.shift(), queue, results);
      running.push(task);
      task.finally(() => {
        const idx = running.indexOf(task);
        if (idx >= 0) {
          running.splice(idx, 1);
        }
      });
    } else {
      // eslint-disable-next-line no-await-in-loop
      await Promise.race(running);
    }
  }
  return results;
}

function extractionHandler(log, od) {
  return async ({ parentPath, driveItem }, queue, results) => {
    // console.log(driveItem);
    const relPath = path.join(parentPath, driveItem.name);
    if (driveItem.file) {
      if (!relPath.endsWith('.md')) {
        // skip non-md files
        return;
      }
      log.info(`downloading ${driveItem.webUrl} as ${relPath}`);
      const result = await od.downloadDriveItem(driveItem);
      const fields = await extractFields(result);
      results.push({
        itemPath: driveItemToPath(driveItem),
        path: relPath,
        ...fields,
      });
    } else if (driveItem.folder) {
      const result = await od.listChildren(driveItem);
      for (const childItem of result.value) {
        queue.push({
          parentPath: relPath,
          driveItem: childItem,
        });
      }
    }
  };
}

async function extractRecursively(log, od, driveItem) {
  return processQueue([{ parentPath: '', driveItem }], extractionHandler(log, od));
}

function verifyHandler(log, od) {
  return async (row, queue, results) => {
    log.info('verifying', row.itemPath);
    const driveItem = pathToDriveItem(row.itemPath);
    const result = await od.downloadDriveItem(driveItem);
    const fields = await extractFields(result);
    Object.entries(fields).forEach(([key, value]) => {
      row[`${key}_original`] = value;
    });
    results.push(row);
  };
}

async function verifyChanges(log, od, table) {
  return processQueue(table, verifyHandler(log, od));
}

function updateHandler(log, od) {
  return async (row, queue, results) => {
    log.info('updating', row.itemPath);
    const driveItem = pathToDriveItem(row.itemPath);
    const result = await od.downloadDriveItem(driveItem);
    const updated = await updateMarkdown(result, row);
    await od.uploadDriveItem(updated, driveItem);

    // extract again
    const fields = await extractFields(updated);
    Object.entries(fields).forEach(([key, value]) => {
      row[`${key}_original`] = value;
    });
    results.push(row);
  };
}

async function updateChanges(log, od, table) {
  return processQueue(table, updateHandler(log, od));
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
    const rootFolder = pathToDriveItem(root);
    const result = await od.listChildren(rootFolder, '');

    // console.log(result);
    const value = result.value.map((item) => ({
      name: item.name,
      itemPath: driveItemToPath(item),
    }));
    res
      .set('content-type', 'application/json')
      .json(value);
  } catch (e) {
    req.log.error(`unable to fetch list: ${e.statusCode}: ${e.message}`);
    res.status(e.statusCode || 500);
    res.send('error');
  }
}

/**
 * Handles 'GET /api/extract'
 */
async function apiExtractHandler(req, res) {
  try {
    const { root } = req.query;
    if (!root) {
      res
        .set('content-type', 'application/json')
        .json([]);
      return;
    }
    const od = new MyOneDrive(req);
    let rootFolder;
    if (root.startsWith('https://')) {
      // assume share link
      rootFolder = await od.getDriveItemFromShareLink(root);
    } else {
      rootFolder = pathToDriveItem(root);
      rootFolder.folder = true; // assume folder
    }

    const result = await extractRecursively(req.log, od, rootFolder);
    result.sort((r0, r1) => r0.path.localeCompare(r1.path));
    res
      .set('content-type', 'application/json')
      .json(result);
  } catch (e) {
    req.log.error(`unable to extract list: ${e.statusCode}: ${e.message}`);
    res.status(e.statusCode || 500);
    res.send('error');
  }
}

/**
 * Handles 'POST /api/verify'
 */
async function apiVerifyHandler(req, res) {
  try {
    const { log } = req;
    log.info(req.body);
    const od = new MyOneDrive(req);
    const result = await verifyChanges(log, od, req.body);
    result.sort((r0, r1) => r0.path.localeCompare(r1.path));
    res
      .set('content-type', 'application/json')
      .json(result);
  } catch (e) {
    req.log.error(`unable to extract list: ${e.statusCode}: ${e.message}`);
    res.status(e.statusCode || 500);
    res.send('error');
  }
}

/**
 * Handles 'POST /api/update'
 */
async function apiUpdateHandler(req, res) {
  try {
    const { log } = req;
    log.info(req.body);
    const od = new MyOneDrive(req);
    const result = await updateChanges(log, od, req.body);
    res
      .set('content-type', 'application/json')
      .json(result);
  } catch (e) {
    req.log.error(`unable to update list: ${e.statusCode}: ${e.message}`);
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
  app.use(express.static('static', {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('/index.html')) {
        res.set('X-Frame-Options', 'sameorigin');
      }
    },
  }));
  app.use(express.json({ limit: '10mb' }));

  app.locals.pkgJson = pkgJson;

  // app.get('/', asyncHandler(indexHandler));
  app.get('/ping', asyncHandler(pingHandler));
  app.get('/api', asyncHandler(apiHandler));
  app.get('/api/me', asyncHandler(apiMeHandler));
  app.get('/api/list', asyncHandler(apiListHandler));
  app.get('/api/extract', asyncHandler(apiExtractHandler));
  app.post('/api/verify', asyncHandler(apiVerifyHandler));
  app.post('/api/update', asyncHandler(apiUpdateHandler));

  app.use(errorHandler(log));

  return app;
}

module.exports = createApp;
