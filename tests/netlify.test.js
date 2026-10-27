// Run with: node tests/netlify.test.js
// Each netlify/<site>/index.html must be an up-to-date single-file build of src/<site>/.
const fs = require('fs'), path = require('path'), assert = require('assert');
const { SITES, buildAll } = require('../tools/build-netlify.js');
const root = path.join(__dirname, '..');
const built = buildAll();
SITES.forEach((site) => {
  const dir = path.join(root, 'netlify', site);
  assert.deepStrictEqual(fs.readdirSync(dir), ['index.html'], 'netlify/' + site + ' holds only index.html');
  assert.strictEqual(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), built[site],
    'netlify/' + site + '/index.html is out of date: run node tools/build-netlify.js');
});
console.log('OK: netlify single-file builds are up to date');
