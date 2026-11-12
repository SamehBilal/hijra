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
| `index.html` | The story in English. Each `<section class="js-section">` is one leg of the journey. |
| `ar.html` | The story in Arabic (right to left), with the same sections |
| `css/style.css` | Styles, including the night/morning/day themes and the right-to-left layout |
| `js/story.js` | Switches the time of day as you scroll, shows the map band on phones, and re-measures the page once fonts and photos load |
| `img/map.svg`, `img/map-ar.svg` | The English and Arabic maps. Both are generated, so don't edit them by hand. |
| `tools/build-map.js` | Builds both maps: stops, route, labels and decoration |
| `tools/ksa-provinces.json` | Province outlines taken from the KSA Map SVG |
| `img/photos/*.jpg` | Photos from Wikimedia Commons, credited under each picture on the page |
| `img/caravan.svg` | The travel marker |
| `dist/app.js` | The template's map script (bundled) |
| `src/` | Source for `dist/app.js` |
| `manifest.webmanifest` | The app: name, icons, shortcuts (English, Arabic) and install screenshots |
| `sw.js` | Service worker: saves the whole story on the first visit so it works offline |
| `js/pwa.js` | Install button, "update now" notice, offline notices, and the browser bar's colour per time of day |
| `offline.html` | Shown for a page that isn't saved yet while offline |
| `img/icons/` | App icons. Edit `icon.svg`, `maskable.svg` or `favicon.svg`; the PNGs are generated. |
| `img/screens/`, `img/og/` | Install screenshots and link-share images, generated from the real pages |
| `tools/build-images.js` | Renders the icon PNGs, screenshots and share images with headless Edge or Chrome |
| `tools/build-sw.js` | Writes the service worker's file list and version |

## Editing the story

**Text and images:** edit `index.html` and `ar.html`, and keep their sections in the same order. On a section:
- `data-time="night"`, `"morning"` or `"day"` sets the theme while that section is being read. At night the map turns dark blue and the text turns light.
- `data-zoom-start` / `data-zoom-middle` set the map zoom at the start and middle of the section.
- `data-icon="img/caravan.svg"` shows the travel marker at the tip of the route.
- `<img class="js-image" data-pos="0.5">` draws a pointer from the image to that point (0 to 1) along the section's leg.

**Stops and route:** edit `STOPS`, `TRAIL` and `CAMERA` in `tools/build-map.js`, then run:

```bash
node tools/build-map.js --debug
```

This builds `img/map.svg` and `img/map-ar.svg`. The Arabic stop names are in `STOP_AR`. `--debug` also writes `tools/map-debug.svg` and `tools/map-debug-ar.svg`, which show the hidden route and stops so you can check them.

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

## The app (PWA)

The story installs as an app and works offline after the first visit. After changing any file, run:

```bash
node tools/build-sw.js
```

This updates the service worker's version, so people who installed the app get an "Update now" notice.

If the pages change how they look, re-render the screenshots and share images (and the icon PNGs if you edited their SVGs). This uses Edge or Chrome, whichever is installed:

```bash
node tools/build-images.js
```

You can also pass `icons`, `screens` or `og` to render only those. Which sections are photographed is listed in `SCREENS` at the top of the script. Run `tools/build-sw.js` afterwards.

The share tags (Open Graph, Twitter, JSON-LD) and the canonical and language links are at the top of each page, between `<!-- share -->` and `<!-- /share -->`. They use the full address https://samehbilal.github.io/hijra/.

## Changes to the template script

These are applied in both `dist/app.js` and `src/`:
- A stop's "stay" comes from `data-stay` on its circle in the map. The original read it from the section with the same index, which breaks once you have more than one stay.
- Finding where a stop sits on the route now scans the whole path. The original search could match a stop to the wrong part of a long route.
- Colours and the label font now match the map's desert palette.
- Each page can choose its own map with `<body data-map="...">`.
- On phones (720px wide or less) the map is shown as a band across the top 42% of the screen while the story is being read, and the text scrolls up underneath it. The camera centres the route inside the band, and the image pointers and the text-panel fade are left out there.
- On a right-to-left page (`<html dir="rtl">`) the map is mirrored: the camera centres on the left, labels sit to the left of each stop, and the text-panel fade is drawn on the right.

Rebuilding `dist/app.js` from `src/` (`npm install && npm run build`) needs the template's old webpack 1 and Babel 6 toolchain. You don't need to rebuild it to edit the story.
