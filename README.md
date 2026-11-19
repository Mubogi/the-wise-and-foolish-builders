# The Wise & Foolish Builders

A playable 2D cutaway cross-section and isometric building strategy game about
building a life on the rock instead of the sand.

Grounded in **Matthew 7:24-27**, **Luke 6:48**, and **1 Corinthians 3:10-15**.

Built with vanilla HTML, CSS, and JavaScript on HTML5 Canvas. No frameworks, no
build step required to play in a browser.

---

## Play it

| Platform | How |
|---|---|
| **Browser (online)** | https://mubogi.github.io/the-wise-and-foolish-builders/ |
| **Android** | Download `Wise-and-Foolish-Builders-1.0.0.apk` from [Releases](../../releases) |
| **Windows** | Download `Wise-and-Foolish-Builders-1.0.0-win-x64.zip`, unzip, run the `.exe` |
| **Linux** | Download the `.AppImage` (`chmod +x`, then run) or the `.tar.gz` |
| **From source** | `npm start`, then open http://localhost:12000 |

The desktop and Android builds are fully offline. Saves are stored locally.

### Android install

The APK is signed with a self-signed key, so Android will warn about an unknown
source. That is expected for a game distributed outside the Play Store:

1. Copy the APK to your device and tap it.
2. Allow "install unknown apps" for your file manager when prompted.
3. Launch **Wise & Foolish Builders**.

Requires Android 5.0 (API 21) or newer.

### Windows / Linux notes

The Windows build is a portable zip — no installer, no admin rights, nothing
written outside your user folder. The executable is unsigned, so SmartScreen may
show a warning; choose "More info" → "Run anyway".

The AppImage needs `chmod +x` before its first run.

---

## How to play

You have limited hours each day. Spend them on **visible** work (reputation,
career, ministry, family appearance) or **hidden** work (secret prayer,
integrity, repentance, forgiveness, generosity, kept promises, costly obedience).

Every few days a storm hits. Storms are resolved *per piling*, so a single
neglected foundation stone can crack even when everything else looks healthy.

**The core tension:** a taller house catches more wind. You cannot maximise both
height and depth, so you have to decide what the life is actually for.

### Controls

| Key | Action |
|---|---|
| `1` – `3` | Pick a dilemma choice |
| `Space` | End the day |
| `B` | Builder's Blueprint Log |
| `S` | Save |
| `Esc` | Close dialog |

---

## The foundation stones

| Stone | Scripture | What it builds |
|---|---|---|
| Secret Prayer | Matthew 6:6 | Intimacy with God that no audience can inflate |
| Integrity | Proverbs 11:3 | Being the same person in private and public |
| Repentance | 1 John 1:9 | Turning, not just regretting |
| Forgiveness | Matthew 6:14 | Releasing the debt you are owed |
| Generosity | Matthew 6:19-21 | Treasure moved where it cannot be lost |
| Kept Promises | Ecclesiastes 5:4-5 | Words that cost you something |
| Costly Obedience | Luke 6:46-49 | Doing what Scripture says when it is expensive |

---

## Building from source

Requires Node.js 18+.

```bash
npm install
npm run build:web      # → dist/  (single-file offline bundle)
```

### Android APK

Needs a JDK 17 and the Android SDK (`build-tools;34.0.0`, `platforms;android-34`).

```bash
export JAVA_HOME=/path/to/jdk17
export ANDROID_HOME=/path/to/android-sdk
npm run build:apk      # → build/out/*.apk
```

The build script drives `aapt2`, `javac`, `d8`, `zipalign`, and `apksigner`
directly — no Gradle. A debug keystore is generated on first run at
`android/keystore.jks`. **Replace it with your own key before distributing
updates**, since Android requires the same signing key for every update.

### Desktop

```bash
npm run build:desktop                                    # Linux + Windows
node tools/build-desktop.mjs --linux AppImage tar.gz     # Linux only
node tools/build-desktop.mjs --win zip                   # Windows only
```

Building the Windows target on Linux works because `signAndEditExecutable` is
disabled. Enabling it (to set a custom exe icon or embed a signature) requires
Wine.

---

## Project layout

```
index.html            entry point (ES modules)
css/style.css         all styling, including responsive rules
js/data.js            dilemmas, foundation stones, storms, seasons, reflections
js/state.js           game state, storm resolution, save/load
js/render.js          the cutaway canvas renderer
js/ui.js              DOM binding and modal system
js/game.js            bootstrap and main loop
desktop/              Electron wrapper (main process + package manifest)
android/              manifest, resources, icons, WebView activity
tools/                build scripts for web, APK, and desktop
```

`dist/` and `build/` are generated and not committed.

---

## Design notes

Storm resolution:

```
load    = storm power + (outward structure × 0.7) + (sand × 1.9 × storm weight)
defense = average effective depth × sand penalty × stress drag
```

Digging gets harder the deeper you go, so anchoring all seven pilings is a real
achievement. Balance was verified headlessly: a disciplined builder weathers
roughly 4.3 of 5 storms, while a builder chasing visible output collapses in all
five.

---

## License

MIT — see [LICENSE](LICENSE).
