# The Hijra: From Makkah to Al-Madinah

An interactive scrolling map story of the Hijra, the migration of the Prophet Muhammad ﷺ and Abu Bakr from Makkah to Al-Madinah in 622 CE. As you scroll, the route is drawn across a map of the Hijaz, from Makkah to Ghar Thawr, down the coast past Usfan and Qudayd, through al-‘Arj, and on to Quba and Al-Madinah.

Built on the Codrops "Interactive Storytelling" template (Lucas Bebber), with the map drawn from the [KSA Map](https://codepen.io/MhmdEzz/pen/eYzwXBb) SVG by Mhmd EzzEdlien.

## Run it

The page loads `img/map.svg` with a request, so it has to be served over HTTP. Opening `index.html` directly from disk won't work.

```bash
node tools/serve.js
```

Then open http://localhost:8080. Any static host (for example GitHub Pages) also works as is.

## Where things are

| File | What it is |
|---|---|
| `index.html` | The story. Each `<section class="js-section">` is one leg of the journey. |
| `css/style.css` | Styles |
| `img/map.svg` | The map. Generated, so don't edit it by hand. |
| `tools/build-map.js` | Builds `img/map.svg`: stops, route, labels and decoration |
| `tools/ksa-provinces.json` | Province outlines taken from the KSA Map SVG |
| `img/story/*.svg`, `img/caravan.svg` | Illustrations and the travel marker |
| `dist/app.js` | The template's map script (bundled) |
| `src/` | Source for `dist/app.js` |

## Editing the story

**Text and images:** edit `index.html`. On a section:
- `data-zoom-start` / `data-zoom-middle` set the map zoom at the start and middle of the section.
- `data-icon="img/caravan.svg"` shows the travel marker at the tip of the route.
- `<img class="js-image" data-pos="0.5">` draws a pointer from the image to that point (0 to 1) along the section's leg.

**Stops and route:** edit `STOPS`, `TRAIL` and `CAMERA` in `tools/build-map.js`, then run:

```bash
node tools/build-map.js --debug
```

`--debug` also writes `tools/map-debug.svg`, which shows the hidden route and stops so you can check them.

Each stop gets one section in `index.html`. A stop with `stay: true` gets two: one that stays on the stop and one that travels on to the next stop. The current order is:

| # | Section | Map |
|---|---|---|
| 1 | Makkah | Makkah → Ghar Thawr |
| 2 | Ghar Thawr | stays at the cave |
| 3 | (continued) | Ghar Thawr → Usfan |
| 4 | Usfan | Usfan → Qudayd |
| 5 | Qudayd | stays at Qudayd |
| 6 | (continued) | Qudayd → al-‘Arj |
| 7 | Al-‘Arj | al-‘Arj → Quba |
| 8 | Quba | stays at Quba |
| 9 | (continued) | Quba → Al-Madinah |
| 10 | Al-Madinah | stays at Al-Madinah |
| 11 | Epilogue | zooms out over the whole route |

## Changes to the template script

These are applied in both `dist/app.js` and `src/`:
- A stop's "stay" comes from `data-stay` on its circle in the map. The original read it from the section with the same index, which breaks once you have more than one stay.
- Finding where a stop sits on the route now scans the whole path. The original search could match a stop to the wrong part of a long route.
- Colours and the label font now match the map's desert palette.

Rebuilding `dist/app.js` from `src/` (`npm install && npm run build`) needs the template's old webpack 1 and Babel 6 toolchain. You don't need to rebuild it to edit the story.
