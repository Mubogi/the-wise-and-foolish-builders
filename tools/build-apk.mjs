/**
 * build-apk.mjs — assemble, compile, dex, package and sign the Android app
 * using the raw SDK tools (no Gradle needed).
 */
import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, copyFile, readdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SDK = process.env.ANDROID_HOME || '/tmp/andtools/sdk';
const BT = path.join(SDK, 'build-tools/34.0.0');
const PLATFORM = path.join(SDK, 'platforms/android-34/android.jar');
const JAVA_HOME = process.env.JAVA_HOME || '/tmp/andtools/jdk-17.0.21.1+2';

const BUILD = path.join(ROOT, 'build/apk');
const OUT = path.join(ROOT, 'build/out');
const KEYSTORE = path.join(ROOT, 'android/keystore.jks');
const KEY_ALIAS = 'wisebuilders';
const KEY_PASS = 'wisebuilders';

const run = (cmd, args, opts = {}) => {
  process.stdout.write(`  ${path.basename(cmd)} ${args.slice(0, 3).join(' ')}...\n`);
  return execFileSync(cmd, args, { stdio: 'pipe', maxBuffer: 1 << 28, ...opts });
};

const sh = (cmd, opts = {}) =>
  execFileSync('bash', ['-c', cmd], { stdio: 'pipe', maxBuffer: 1 << 28, ...opts });

console.log('== prepare ==');
await rm(BUILD, { recursive: true, force: true });
await mkdir(path.join(BUILD, 'gen'), { recursive: true });
await mkdir(path.join(BUILD, 'classes'), { recursive: true });
await mkdir(path.join(BUILD, 'dex'), { recursive: true });
await mkdir(OUT, { recursive: true });

// Stage the offline web build into assets/www
const assetsWww = path.join(ROOT, 'android/assets/www');
await rm(assetsWww, { recursive: true, force: true });
await mkdir(assetsWww, { recursive: true });
await cp(path.join(ROOT, 'dist'), assetsWww, { recursive: true });
console.log('  staged dist/ -> android/assets/www');

console.log('== aapt2 compile resources ==');
const resDir = path.join(ROOT, 'android/res');
const compiledRes = path.join(BUILD, 'compiled.zip');
const resFiles = [];
for (const entry of await readdir(resDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  for (const f of await readdir(path.join(resDir, entry.name))) {
    resFiles.push(path.join(resDir, entry.name, f));
  }
}
const flatDir = path.join(BUILD, 'flat');
await mkdir(flatDir, { recursive: true });
for (const f of resFiles) {
  run(path.join(BT, 'aapt2'), ['compile', '-o', flatDir, f]);
}
const flats = (await readdir(flatDir)).map((f) => path.join(flatDir, f));

console.log('== aapt2 link ==');
const baseApk = path.join(BUILD, 'base.apk');
const linkArgs = [
  'link',
  '-o', baseApk,
  '-I', PLATFORM,
  '--manifest', path.join(ROOT, 'android/AndroidManifest.xml'),
  '--java', path.join(BUILD, 'gen'),
  '--min-sdk-version', '21',
  '--target-sdk-version', '34',
  '--version-code', '1',
  '--version-name', '1.0.0',
  '-A', path.join(ROOT, 'android/assets'),
  ...flats,
];
run(path.join(BT, 'aapt2'), linkArgs);

console.log('== javac ==');
const javaSrc = path.join(ROOT, 'android/java');
const genSrc = path.join(BUILD, 'gen');
const srcs = sh(`find ${javaSrc} ${genSrc} -name '*.java'`).toString().trim().split('\n').filter(Boolean);
run(`${JAVA_HOME}/bin/javac`, [
  '-source', '8', '-target', '8',
  '-bootclasspath', PLATFORM,
  '-classpath', PLATFORM,
  '-d', path.join(BUILD, 'classes'),
  ...srcs,
]);

console.log('== d8 (dex) ==');
const classFiles = sh(`find ${path.join(BUILD, 'classes')} -name '*.class'`)
  .toString().trim().split('\n').filter(Boolean);
run(`${BT}/d8`, [
  '--min-api', '21',
  '--lib', PLATFORM,
  '--output', path.join(BUILD, 'dex'),
  ...classFiles,
]);

console.log('== add classes.dex to apk ==');
const unsigned = path.join(BUILD, 'unsigned.apk');
sh(`python3 ${path.join(ROOT, 'tools/add-dex.py')} ${baseApk} ${path.join(BUILD, 'dex/classes.dex')} ${unsigned}`);

console.log('== zipalign ==');
const aligned = path.join(BUILD, 'aligned.apk');
run(path.join(BT, 'zipalign'), ['-f', '-p', '4', unsigned, aligned]);

console.log('== keystore ==');
if (!existsSync(KEYSTORE)) {
  run(`${JAVA_HOME}/bin/keytool`, [
    '-genkeypair', '-v',
    '-keystore', KEYSTORE,
    '-alias', KEY_ALIAS,
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-storepass', KEY_PASS, '-keypass', KEY_PASS,
    '-dname', 'CN=Wise and Foolish Builders, OU=Games, O=Mubogi, L=, ST=, C=US',
  ]);
  console.log('  keystore created');
}

console.log('== apksigner ==');
const finalApk = path.join(OUT, 'Wise-and-Foolish-Builders-1.0.0.apk');
run(`${BT}/apksigner`, [
  'sign',
  '--ks', KEYSTORE,
  '--ks-key-alias', KEY_ALIAS,
  '--ks-pass', `pass:${KEY_PASS}`,
  '--key-pass', `pass:${KEY_PASS}`,
  '--out', finalApk,
  aligned,
]);

console.log('== verify ==');
const verify = run(`${BT}/apksigner`, ['verify', '--verbose', finalApk]);
console.log(verify.toString().split('\n').slice(0, 6).join('\n'));

console.log(`\nAPK ready: ${finalApk}`);
