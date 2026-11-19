# The Wise & Foolish Builders

A playable 2D cutaway cross-section and isometric building strategy game about
building a life on the rock instead of the sand.

Grounded in **Matthew 7:24-27**, **Luke 6:48**, and **1 Corinthians 3:10-15**.

The canvas shows both layers at once: the visible life above ground (work,
family, ministry, reputation) and the hidden foundation below it (secret prayer,
integrity, repentance, forgiveness, sacrificial generosity, kept promises,
costly obedience).

## Run it

No build step, no dependencies. Because the game uses ES modules, it needs to be
served over HTTP rather than opened as a `file://` URL.

```bash
# any static server works
python3 -m http.server 12000
# then open http://localhost:12000
```

```bash
# or with Node
npx serve .
```

## How to play

Each day you get **10 hours of time and energy**. Spend them on dilemma cards
from the deck, or on the free actions beneath the canvas.

| Resource | Meaning |
| --- | --- |
| **Time & Energy** | The daily budget. Every choice costs hours. |
| **Foundation Depth** | Hidden obedience driven into bedrock across seven pilings. |
| **Outward Structure** | Visible ministry, career, family life, public testimony. |
| **Sand / Shortcuts** | Warning metric. Shortcuts, people-pleasing, hypocrisy, unconfessed sin. |
| **Structural Stress** | Strain the walls are carrying right now. |

A storm lands at the end of every season (five seasons, twenty days). Any part
built on sand cracks or collapses; pilings anchored in rock hold — and a strong
house shelters its neighbours.

If the structure cracks, grace lets you clear the sand, repent, and repour the
piling deeper.

### Controls

| Key | Action |
| --- | --- |
| `1` `2` `3` | Open a dilemma card |
| `1` `2` `3` | Pick a choice inside a dilemma |
| `Space` | End the day |
| `B` | Builder's Blueprint Log |
| `R` | Post-storm reflection guide |
| `S` / `L` | Save / load |
| `Esc` | Close a dialog |
| `?` | Help |

Speed controls (0.5× to 4×) are in the header.

## How a storm is resolved

```
load    = storm power + (outward structure × 0.7) + (sand × 1.9 × storm weight)
defense = average effective depth × sand penalty × stress drag
```

Each piling is then checked **individually**, so one neglected piling can crack
even when the average looks healthy — which is how a real foundation fails.

Digging gets harder the deeper you go, so anchoring all seven pilings is a real
achievement rather than a formality.

## Project layout

```
index.html        markup shell
css/style.css     design system (parchment + night-slate palette)
js/data.js        all content: dilemmas, pilings, storms, seasons, reflections
js/state.js       simulation, storm math, save/load — no DOM
js/render.js      cutaway canvas renderer, weather, particles
js/ui.js          DOM layer: meters, deck, modals, journal
js/game.js        bootstrap and animation loop
```

The layers are deliberately separated: `state.js` has no DOM or canvas
references, so the simulation can be run headlessly for balance testing.

## Features

- Dual-layer cutaway canvas with animated rain, rising floodwater, wind gusts, lightning and structural debris
- 12 authored life dilemmas, each with 2-3 choices and a written outcome
- Seven foundation pilings, each with its own Scripture and principle
- Five distinct storms, each punishing a different weakness
- Builder's Blueprint Log explaining the biblical principle behind every stone
- Post-storm reflection guide with three questions for classes and families
- localStorage save/load with autosave
- Responsive layout from phone to widescreen
- Reduced-motion support

## License

MIT — see [LICENSE](LICENSE).
