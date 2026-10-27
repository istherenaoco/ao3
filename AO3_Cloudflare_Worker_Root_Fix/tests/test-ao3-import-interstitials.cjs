const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('public/assets/app.js', 'utf8');

function loadFunction(name, nextName) {
  const start = app.indexOf('function ' + name + '(');
  const end = app.indexOf('function ' + nextName + '(', start + 1);
  assert.notEqual(start, -1, name + ' exists');
  assert.notEqual(end, -1, nextName + ' exists');
  const declaration = app.slice(start, end);
  return vm.runInNewContext(declaration + '\n' + name);
}

const parseHtml = loadFunction('parseAo3HtmlDocument', 'parseAo3JinaMarkdown');
const parseJina = loadFunction('parseAo3JinaMarkdown', 'extractAo3WorkInfo');
const challengeHtml = '<!doctype html><title>Shields are up! | Archive of Our Own</title><h1>Shields are up!</h1>';
const challengeMarkdown = 'Title: Shields are up! | Archive of Our Own\n\nMarkdown Content:\n\n# Shields are up!\n\nPlease wait while we protect our servers. ' + 'Additional verification required. '.repeat(12);

assert.equal(parseHtml(challengeHtml, '').reason, 'cloudflare');
assert.equal(parseJina(challengeMarkdown, '').reason, 'cloudflare');

console.log('AO3 Cloudflare shield interstitials are rejected by HTML and Jina parsers.');
