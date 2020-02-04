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
const fs = require('fs-extra');
const path = require('path');
const unified = require('unified');
const remark = require('remark-parse');
const chalk = require('chalk');
// const inspect = require('unist-util-inspect');
const { selectAll } = require('unist-util-select');
const klaw = require('klaw');
const stringify = require('remark-stringify');
const csvStringify = require('csv-stringify/lib/sync');
const csvParse = require('csv-parse/lib/sync');

const { info, debug } = require('@adobe/helix-log');

/**
 * Creates a processor that extracts and updates fields from text nodes.
 */
function textProcessor(selector, regexp) {
  return {
    extract: (mdast) => {
      const result = [];
      const nodes = selectAll(selector, mdast);
      nodes.forEach((node) => {
        const match = regexp.exec(node.value || '');
        if (match) {
          result.push(match[2]);
        }
      });
      return result.join(', ');
    },
    update: (mdast, cfg, docInfo) => {
      const nodes = selectAll(selector, mdast);
      nodes.forEach((node) => {
        const match = regexp.exec(node.value || '');
        if (match) {
          const newValue = docInfo[cfg.field] || '';
          // eslint-disable-next-line no-param-reassign
          node.value = node.value.replace(regexp, `$1${newValue}`);
        }
      });
    },
  };
}

const config = [{
  field: 'topics',
  processor: textProcessor('thematicBreak:last-of-type ~ paragraph > text', /^(Topics:\s*)(.*)/),
}, {
  field: 'products',
  processor: textProcessor('thematicBreak:last-of-type ~ paragraph > text', /^(Products:\s*)(.*)/),
}];

async function extractFile(filePath) {
  const md = await fs.readFile(filePath, 'utf-8');
  const mdast = unified()
    .use(remark)
    .parse(md);

  const result = {
    path: path.relative('.', filePath),
  };
  config.forEach((cfg) => {
    result[cfg.field] = cfg.processor.extract(mdast);
  });
  debug(result);
  return result;
}

async function updateFile(docInfo) {
  const md = await fs.readFile(docInfo.path, 'utf-8');
  const mdast = unified()
    .use(remark)
    .parse(md);
  config.forEach((cfg) => {
    cfg.processor.update(mdast, cfg, docInfo);
  });
  // info(inspect(mdast));

  const newMd = unified()
    .use(stringify, {
      bullet: '-',
      fence: '`',
      fences: true,
      incrementListMarker: true,
      rule: '-',
      ruleRepetition: 3,
      ruleSpaces: false,
    }).stringify(mdast);

  const filePath = `${docInfo.path}-new.md`;
  await fs.writeFile(filePath, newMd, 'utf-8');
  info(chalk`updated {yellow ${filePath}}`);
}

async function extract(args) {
  let out = process.stdout;
  if (args.output !== '-') {
    out = fs.createWriteStream(args.output);
  }
  const rows = [];
  if (fs.lstatSync(args.path).isDirectory()) {
    for await (const file of klaw(args.path)) {
      if (!file.stats.isDirectory()) {
        rows.push(await extractFile(file.path));
      }
    }
  } else {
    rows.push(await extractFile(args.path));
  }
  if (rows.length === 0) {
    return [];
  }
  if (args.json) {
    out.write(JSON.stringify(rows, null, 2));
  } else {
    out.write(csvStringify(rows, { header: true }));
  }
  if (out !== process.stdout) {
    out.close();
  }
  return rows;
}

async function update(args) {
  const table = await fs.readFile(args.input, 'utf-8');
  let data;
  if (table.startsWith('[')) {
    data = JSON.parse(table);
  } else {
    data = csvParse(table, {
      columns: true,
      skip_empty_lines: true,
    });
  }

  for (const row of data) {
    // eslint-disable-next-line no-await-in-loop
    await updateFile(row);
  }
}

module.exports = {
  extract,
  update,
};
