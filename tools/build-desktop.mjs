/**
 * build-desktop.mjs — stage the offline web build into an Electron app and
 * package it for Windows and Linux.
 *
 * Pass targets on the command line, e.g.:
 *   node tools/build-desktop.mjs --win zip
 *   node tools/build-desktop.mjs --linux AppImage tar.gz
 */
import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, copyFile, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const STAGE = path.join(ROOT, 'build/desktop');
const OUT = path.join(ROOT, 'build/out/desktop');

const args = process.argv.slice(2);
const targets = args.length ? args : ['--linux', 'AppImage', 'tar.gz', '--win', 'zip'];

console.log('== stage ==');
await rm(STAGE, { recursive: true, force: true });
await mkdir(STAGE, { recursive: true });

await copyFile(path.join(ROOT, 'desktop/main.js'), path.join(STAGE, 'main.js'));
await copyFile(path.join(ROOT, 'desktop/icon.png'), path.join(STAGE, 'icon.png'));
await cp(path.join(ROOT, 'dist'), path.join(STAGE, 'www'), { recursive: true });

const pkg = JSON.parse(await readFile(path.join(ROOT, 'desktop/package.json'), 'utf8'));
pkg.devDependencies = { electron: '31.7.7' };
pkg.build.directories.output = OUT;
pkg.repository = {
  type: 'git',
  url: 'https://github.com/Mubogi/the-wise-and-foolish-builders.git',
};
await writeFile(path.join(STAGE, 'package.json'), JSON.stringify(pkg, null, 2));

// electron-builder resolves electron from node_modules; link the root install.
try {
  execFileSync('ln', ['-sfn', path.join(ROOT, 'node_modules'), path.join(STAGE, 'node_modules')]);
} catch {
  /* symlinks may be unavailable; electron-builder falls back to devDependencies */
}

await mkdir(OUT, { recursive: true });

console.log('== package ==');
const cli = path.join(ROOT, 'node_modules/.bin/electron-builder');
execFileSync(cli, [...targets, '--publish', 'never'], {
  cwd: STAGE,
  stdio: 'inherit',
  maxBuffer: 1 << 28,
});

console.log(`\nDesktop artifacts in ${OUT}`);
