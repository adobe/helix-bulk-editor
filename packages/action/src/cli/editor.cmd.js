/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

'use strict';

const editor = require('./editor.js');

function install(yargs) {
  return yargs
    .command({
      command: 'extract <path>',
      desc: 'Extract the fields of the given file(s)',
      handler: editor.extract,
      builder: (y) => y
        .positional('path', {
          description: 'Path to the file or directory to extract.',
        })
        .option('json', {
          alias: 'j',
          type: 'boolean',
          description: 'output as json',
        })
        .option('output', {
          description: 'output file. use "-" for stdout.',
          alias: 'o',
          required: true,
          default: '-',
        }),
    })
    .command({
      command: 'update <input>',
      desc: 'Extract the fields of the given file(s)',
      handler: editor.update,
      builder: (y) => y
        .positional('input', {
          description: 'Input file in tsv format',
        }),
    });
}

module.exports = install;
