// Builds the instructor Version Inspectors as single self-contained files by inlining
// each exam's engine, so they work even when saved on their own.
// Run with: node tools/build-instructor.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const BUILDS = [
  { src: 'tools/version-inspector.src.html', engine: 'site/js/engine.js', out: 'instructor/version-inspector.html' },
  { src: 'tools/part2-inspector.src.html', engine: 'part2-site/js/engine.js', out: 'instructor/part2-inspector.html' }
];
for (const b of BUILDS) {
  const src = fs.readFileSync(path.join(root, b.src), 'utf8');
  const engine = fs.readFileSync(path.join(root, b.engine), 'utf8');
  if (engine.includes('</script')) throw new Error(b.engine + ' cannot be inlined: it contains </script');
  fs.writeFileSync(path.join(root, b.out), src.replace('/*__ENGINE__*/', () => engine));
  console.log('Wrote ' + b.out);
}
