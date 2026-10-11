// Infinity Drumming, 2026: stamp a release version on index.html and version.json.
//
// Phones keep the app's files in their cache for a while, and a page left open
// keeps running whatever it loaded.  So every file index.html loads gets the
// release version in its address ("?v=..."), modules included (through the
// import map in index.html), and version.json says which version is live; an
// open page compares the two (js/updateCheck.js) and offers to update.
//
// Run `npm run stamp` before each release.  tests/version.test.js fails if
// index.html is out of step with version.json (for example after adding a
// module), with a reminder to run it.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// `... from './x.js'` and `import './x.js'`
var IMPORT_RE = /\b(?:from|import)\s*['"]\.\/([\w.-]+\.js)['"]/g;
var IMPORT_MAP_RE = /<script type="importmap">[\s\S]*?<\/script>/;
// local scripts and stylesheets index.html loads (not other sites' files)
var ASSET_RE =
  /(<(?:script|link)\b[^>]*?\b(?:src|href)=["'])((?:\.\/)?[\w./-]+\.(?:js|css))(?:\?v=[^"']*)?(["'])/g;

/** Every module js/main.js imports, directly or not, as "js/<name>.js" (sorted). */
export function moduleGraph(readFile) {
  var found = new Set();
  var todo = ['main.js'];
  while (todo.length) {
    var name = todo.pop();
    for (var match of readFile('js/' + name).matchAll(IMPORT_RE)) {
      var imported = match[1];
      if (!found.has(imported)) {
        found.add(imported);
        todo.push(imported);
      }
    }
  }
  return [...found].sort().map((name) => 'js/' + name);
}

/** index.html with every local script, stylesheet and module stamped with `version`. */
export function stampIndexHtml(html, version, modules) {
  if (!IMPORT_MAP_RE.test(html)) throw new Error('index.html has no <script type="importmap">');
  var imports = {};
  for (var module of modules) imports['./' + module] = './' + module + '?v=' + version;
  var importMap =
    '<script type="importmap">\n' +
    JSON.stringify({ imports: imports }, null, '\t')
      .split('\n')
      .map((line) => '\t\t' + line)
      .join('\n') +
    '\n\t\t</script>';
  return html
    .replace(IMPORT_MAP_RE, importMap)
    .replace(ASSET_RE, (all, start, path, end) =>
      /^\.?\/?(js|css|MIDI\.js|font-awesome)\//.test(path)
        ? start + path + '?v=' + version + end
        : all
    );
}

/** A version for a release made now: the UTC date and time, like 20261011-0530. */
export function newVersion(now) {
  var iso = now.toISOString();
  return iso.slice(0, 10).replace(/-/g, '') + '-' + iso.slice(11, 16).replace(':', '');
}

function main() {
  var version = process.argv[2] || newVersion(new Date());
  // letters, digits, "." and "-" only: it goes in addresses (and js/groove_utils.js
  // finds its sound files by the last "/" in its own address)
  if (!/^[\w.-]+$/.test(version)) throw new Error('Bad version: ' + version);
  var readFile = (path) => readFileSync(join(repoRoot, path), 'utf8');
  var html = stampIndexHtml(readFile('index.html'), version, moduleGraph(readFile));
  writeFileSync(join(repoRoot, 'index.html'), html);
  writeFileSync(join(repoRoot, 'version.json'), '{ "version": ' + JSON.stringify(version) + ' }\n');
  console.log('Stamped index.html and version.json with version ' + version);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
