'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function expandOrigins(metadata, project) {
  assert(Array.isArray(metadata.origins), 'origins must be an array');
  let registry;
  const expanded = [];
  for (const origin of metadata.origins) {
    if (typeof origin === 'string' && origin.startsWith('https://')) {
      expanded.push(origin);
      continue;
    }
    const reference = typeof origin === 'string' && /^@cdn\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(origin);
    assert(reference && metadata.type === 'resolver', 'Invalid origin or resolver CDN reference: ' + String(origin));
    if (!registry) {
      const file = metadata.cdnRegistry;
      assert(typeof file === 'string' && file.endsWith('.json') && !path.isAbsolute(file),
        'cdnRegistry must be a JSON path relative to addon.json');
      registry = JSON.parse(fs.readFileSync(path.resolve(project, file), 'utf8').replace(/^\uFEFF/, ''));
      assert(registry && typeof registry === 'object' && !Array.isArray(registry), 'Invalid CDN registry');
    }
    const group = reference[1];
    const origins = Object.hasOwn(registry, group) && registry[group];
    assert(Array.isArray(origins) && origins.length > 0 && origins.length <= 128 &&
      origins.every(value => typeof value === 'string' && value.startsWith('https://')),
      'Unknown or invalid CDN group: ' + group);
    expanded.push(...origins);
  }
  return [...new Set(expanded)];
}

module.exports = { expandOrigins };
