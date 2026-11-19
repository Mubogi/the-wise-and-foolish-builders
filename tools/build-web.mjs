/**
 * build-web.js — produce a self-contained offline build in dist/.
 * ES modules are bundled into one IIFE so the game runs from file://,
 * inside an Android WebView, and inside Electron without a server.
 */
import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'css'), { recursive: true });
await mkdir(path.join(dist, 'js'), { recursive: true });

await build({
  entryPoints: [path.join(root, 'js/game.js')],
  bundle: true,
  format: 'iife',
  target: ['es2019'],
  minify: true,
  legalComments: 'none',
  outfile: path.join(dist, 'js/game.js'),
});

await copyFile(path.join(root, 'css/style.css'), path.join(dist, 'css/style.css'));
await copyFile(path.join(root, 'manifest.webmanifest'), path.join(dist, 'manifest.webmanifest'));
await copyFile(path.join(root, 'sw.js'), path.join(dist, 'sw.js'));
await mkdir(path.join(dist, 'assets'), { recursive: true });
await copyFile(path.join(root, 'assets/assets-icon-192.png'), path.join(dist, 'assets/assets-icon-192.png'));
await copyFile(path.join(root, 'assets/assets-icon-512.png'), path.join(dist, 'assets/assets-icon-512.png'));

// Rewrite the module script tag to a plain script and drop the module attribute.
let html = await readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace('<script type="module" src="js/game.js"></script>', '<script src="js/game.js"></script>');
await writeFile(path.join(dist, 'index.html'), html);

// The bundled build ships one script, so cache that instead of the modules.
let sw = await readFile(path.join(root, 'sw.js'), 'utf8');
sw = sw.replace(
  /  '\.\/js\/data\.js',\n  '\.\/js\/state\.js',\n  '\.\/js\/render\.js',\n  '\.\/js\/ui\.js',\n/,
  ''
);
await writeFile(path.join(dist, 'sw.js'), sw);

if (!existsSync(path.join(dist, 'js/game.js'))) throw new Error('bundle missing');
console.log('dist/ ready');
