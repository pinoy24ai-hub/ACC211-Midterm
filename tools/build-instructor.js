// Builds instructor/version-inspector.html as a single self-contained file by
// inlining the exam engine, so the inspector works even when saved on its own.
// Run with: node tools/build-instructor.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'version-inspector.src.html'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'site/js/engine.js'), 'utf8');
if (engine.includes('</script')) throw new Error('engine.js cannot be inlined: it contains </script');
const out = src.replace('/*__ENGINE__*/', () => engine);
fs.writeFileSync(path.join(root, 'instructor/version-inspector.html'), out);
console.log('Wrote instructor/version-inspector.html');
