// Infinity Drumming, 2026: the release version on index.html (scripts/stamp-version.mjs).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { moduleGraph, stampIndexHtml, newVersion } from '../scripts/stamp-version.mjs';

const readFile = (path) => readFileSync(path, 'utf8');

describe('release version stamp', () => {
  it('index.html is stamped with the version in version.json (else run `npm run stamp`)', () => {
    const { version } = JSON.parse(readFile('version.json'));
    const html = readFile('index.html');
    expect(stampIndexHtml(html, version, moduleGraph(readFile))).toBe(html);
  });

  it('the import map covers every module the app loads', () => {
    const html = readFile('index.html');
    const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
    const modules = moduleGraph(readFile);
    expect(modules).toContain('js/groove_writer.js');
    expect(modules).toContain('js/updateCheck.js');
    expect(Object.keys(map.imports).sort()).toEqual(modules.map((m) => './' + m));
  });

  it('stamps local scripts and stylesheets but not other sites or images', () => {
    const html =
      '<script type="importmap"></script>\n' +
      '<link rel="stylesheet" href="css/a.css?v=old">\n' +
      '<link href="https://fonts.example/x.css" rel="stylesheet">\n' +
      '<link rel="icon" href="images/i.png">\n' +
      '<script src="./MIDI.js/p.js"></script>\n' +
      '<script type="module" src="js/main.js"></script>';
    const out = stampIndexHtml(html, '7', ['js/a.js']);
    expect(out).toContain('href="css/a.css?v=7"');
    expect(out).toContain('href="https://fonts.example/x.css"');
    expect(out).toContain('href="images/i.png"');
    expect(out).toContain('src="./MIDI.js/p.js?v=7"');
    expect(out).toContain('src="js/main.js?v=7"');
    expect(out).toContain('"./js/a.js": "./js/a.js?v=7"');
  });

  it('makes versions from the UTC date and time', () => {
    expect(newVersion(new Date('2026-10-11T05:07:30Z'))).toBe('20261011-0507');
  });
});
