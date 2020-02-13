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
const unified = require('unified');
const remark = require('remark-parse');
const { selectAll } = require('unist-util-select');
const stringify = require('remark-stringify');

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

async function extractFields(md) {
  const mdast = unified()
    .use(remark)
    .parse(md);

  const result = {
  };
  config.forEach((cfg) => {
    result[cfg.field] = cfg.processor.extract(mdast);
  });
  return result;
}

async function updateMarkdown(md, docInfo) {
  const mdast = unified()
    .use(remark)
    .parse(md);
  config.forEach((cfg) => {
    cfg.processor.update(mdast, cfg, docInfo);
  });
  // info(inspect(mdast));
  return unified()
    .use(stringify, {
      bullet: '-',
      fence: '`',
      fences: true,
      incrementListMarker: true,
      rule: '-',
      ruleRepetition: 3,
      ruleSpaces: false,
    }).stringify(mdast);
}

module.exports = {
  extractFields,
  updateMarkdown,
};
