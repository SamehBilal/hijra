// Builds img/map.svg for the storytelling map.
//
//   node tools/build-map.js
//
// The canvas script reads three hidden layers from the SVG:
//   #trail-path path  – the dotted route that gets "walked" as you scroll
//   #camera-path path – the line the camera follows (smoother than the trail)
//   #points circle    – the stops. The circle id becomes the label
//                       (underscores -> spaces). data-stay="true" keeps the
//                       camera on that stop for one extra <section>.
// Everything else in the SVG is just the picture of the map.
//
// Coordinates: the KSA province shapes (tools/ksa-provinces.json) use an
// equirectangular projection; lon/lat -> KSA px is calibrated below.

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'ksa-provinces.json'), 'utf8'))

// ---- projection -----------------------------------------------------------
// Fitted to the KSA SVG extremes: Ras Sheikh Hamid (NW), the Jordan/Iraq tripoint (N),
// the Yemen border on the Jizan coast (S); the east tip at 55.67E checks out.
const KX = 47.37, KY = 52.16, KLON = 34.583, KLAT = 32.15
// Crop of the KSA map we show (the Hijaz), and the scale-up factor
const LON0 = 37.6, LON1 = 42.6, LAT0 = 25.9, LAT1 = 20.4
const S = 7.5

const kx = lon => 1 + (lon - KLON) * KX
const ky = lat => 1 + (KLAT - lat) * KY
const X = lon => +((kx(lon) - kx(LON0)) * S).toFixed(2)
const Y = lat => +((ky(lat) - ky(LAT0)) * S).toFixed(2)
const P = ([lon, lat]) => [X(lon), Y(lat)]

const W = Math.round((LON1 - LON0) * KX * S)
const H = Math.round((LAT0 - LAT1) * KY * S)

// ---- language -------------------------------------------------------------
// node tools/build-map.js            -> img/map.svg and img/map-ar.svg
// node tools/build-map.js --lang=ar  -> only img/map-ar.svg
const AR = process.argv.includes('--lang=ar')
const t = (en, ar) => AR ? ar : en
const ARABIC_FONT = "'Amiri', 'Traditional Arabic', serif"

// ---- the story ------------------------------------------------------------
// Stops, in order. [id, lon, lat, stay]
const STOPS = [
  ['Makkah',      39.8262, 21.4225, false],
  ['Ghar_Thawr',  39.8496, 21.3771, true ],
  ['Usfan',       39.3600, 21.9200, false],
  ['Qudayd',      39.2200, 22.3500, true ],
  ['Al-Arj',      39.5000, 23.4000, false],
  ['Quba',        39.6173, 24.4393, true ],
  ['Al-Madinah',  39.6112, 24.4672, true ],
]
// Arabic stop names (the circle id becomes the label on the map)
const STOP_AR = {
  'Makkah': 'مكة', 'Ghar_Thawr': 'غار_ثور', 'Usfan': 'عسفان', 'Qudayd': 'قديد',
  'Al-Arj': 'العرج', 'Quba': 'قباء', 'Al-Madinah': 'المدينة',
}
const stop = id => { const s = STOPS.find(s => s[0] === id); return [s[1], s[2]] }

// Route through the classical stations (Ibn Ishaq): down to the coast below
// Usfan, Amaj, past Qudayd, al-Kharrar, Thaniyat al-Marah, Liqf ... al-Arj,
// Thaniyat al-'A'ir, Batn Rim, then Quba. Intermediate positions are approximate.
const TRAIL = [
  stop('Makkah'),
  [39.842, 21.400],
  stop('Ghar_Thawr'),
  [39.760, 21.352],
  [39.560, 21.395],
  [39.300, 21.560],
  [39.110, 21.720],
  [39.130, 21.850],          // the coast below Usfan
  stop('Usfan'),
  [39.300, 22.120],          // Amaj
  stop('Qudayd'),
  [39.230, 22.640],          // al-Kharrar
  [39.330, 22.950],          // Thaniyat al-Marah / Liqf
  [39.420, 23.180],          // Mudlijah
  stop('Al-Arj'),
  [39.560, 23.780],          // Thaniyat al-'A'ir
  [39.600, 24.150],          // Batn Rim
  stop('Quba'),
  stop('Al-Madinah'),
]
const CAMERA = [
  stop('Makkah'),
  stop('Ghar_Thawr'),
  [39.45, 21.62],
  stop('Usfan'),
  stop('Qudayd'),
  [39.33, 22.90],
  stop('Al-Arj'),
  [39.58, 24.05],
  stop('Quba'),
  stop('Al-Madinah'),
]

// Catmull-Rom spline through the points, as a cubic Bezier path
function smoothPath(lonlats) {
  const p = lonlats.map(P)
  let d = `M${p[0][0]},${p[0][1]}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1.map(v => v.toFixed(2))} ${c2.map(v => v.toFixed(2))} ${p2[0]},${p2[1]}`
  }
  return d
}

// ---- decoration -------------------------------------------------------------
const C = {
  sea: '#d3e4e1', seaDeep: '#c4dad7', shallow: '#e2eeea', wave: '#bcd3cf',
  land: '#f5ecd7', landEdge: '#e8dabb', border: '#dccaa2',
  mountain: '#cbb48a', harrah: '#d9c9a8', harrahDot: '#b9a47d',
  text: '#a8956c', textSea: '#9dbcb7', town: '#b8a27a',
}

// Reference places that are NOT story stops (faint, for orientation)
const TOWNS = [
  [t('Jeddah', 'جدة'), 39.18, 21.50], [t('Ta\'if', 'الطائف'), 40.42, 21.27], [t('Badr', 'بدر'), 38.78, 23.73],
  [t('Yanbu', 'ينبع'), 38.08, 24.09], [t('Al-Juhfa', 'الجحفة'), 39.14, 22.71], [t('Khaybar', 'خيبر'), 39.29, 25.70],
]

// Mountain ridge (Sarawat / Hijaz escarpment), drawn as little peaks
const RIDGE = [[40.55, 20.45], [40.38, 21.05], [40.18, 21.7], [40.0, 22.4], [39.85, 23.0],
  [39.70, 23.6], [39.35, 24.15], [38.95, 24.7], [38.6, 25.3], [38.35, 25.9]]

function along(points, step) {
  // sample evenly (in output px) along a polyline of lon/lat points
  const p = points.map(P), out = []
  for (let i = 0; i < p.length - 1; i++) {
    const [a, b] = [p[i], p[i + 1]]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    for (let t = 0; t < len; t += step) out.push([a[0] + (b[0] - a[0]) * t / len, a[1] + (b[1] - a[1]) * t / len])
  }
  return out
}

// deterministic pseudo-random so the map is stable between builds
let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

function peaks() {
  let s = ''
  along(RIDGE, 22).forEach(([x, y]) => {
    for (let k = 0; k < 3; k++) {
      const ox = x + (rnd() - 0.5) * 70, oy = y + (rnd() - 0.5) * 40, h = 7 + rnd() * 9, w = h * 1.1
      s += `M${(ox - w).toFixed(1)},${(oy + h / 2).toFixed(1)} L${ox.toFixed(1)},${(oy - h / 2).toFixed(1)} L${(ox + w).toFixed(1)},${(oy + h / 2).toFixed(1)} `
    }
  })
  return `<path d="${s}" fill="none" stroke="${C.mountain}" stroke-width="1.3" stroke-linejoin="round" opacity="0.8"/>`
}

// Harrat Rahat – the great lava field south-east of Madinah
function harrah() {
  const outline = [[39.95, 24.30], [40.35, 24.05], [40.45, 23.40], [40.30, 22.70], [40.05, 22.20],
    [39.85, 22.45], [39.90, 23.10], [39.78, 23.70], [39.80, 24.15]].map(P)
  const d = 'M' + outline.map(p => p.join(',')).join(' L') + ' Z'
  let dots = ''
  for (let i = 0; i < 900; i++) {
    const lon = 39.75 + rnd() * 0.75, lat = 22.15 + rnd() * 2.2
    dots += `<circle cx="${X(lon)}" cy="${Y(lat)}" r="${(0.8 + rnd() * 1.6).toFixed(1)}"/>`
  }
  return `<clipPath id="harrah-clip"><path d="${d}"/></clipPath>
  <path d="${d}" fill="${C.harrah}" opacity="0.55" stroke="${C.harrahDot}" stroke-width="1" stroke-dasharray="2 5"/>
  <g clip-path="url(#harrah-clip)" fill="${C.harrahDot}" opacity="0.7">${dots}</g>`
}

function waves() {
  let s = ''
  for (let i = 0; i < 160; i++) {
    const lon = 37.6 + rnd() * 1.9, lat = 20.4 + rnd() * 5.5
    const x = X(lon), y = Y(lat), w = 10 + rnd() * 14
    s += `M${(x - w).toFixed(1)},${y.toFixed(1)} q${(w / 2).toFixed(1)},-5 ${w.toFixed(1)},0 t${w.toFixed(1)},0 `
  }
  return `<path d="${s}" fill="none" stroke="${C.wave}" stroke-width="1.2" stroke-linecap="round"/>`
}

function label(text, lon, lat, { size = 14, fill = C.text, rotate = 0, spacing = 0, weight = 'normal', style = 'normal', anchor = 'middle', family = "Georgia, 'Times New Roman', serif" } = {}) {
  const [x, y] = P([lon, lat])
  return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})" font-family="${family}" font-size="${size}" font-weight="${weight}" font-style="${style}" letter-spacing="${spacing}" text-anchor="${anchor}" fill="${fill}">${text}</text>`
}

function compass(lon, lat) {
  const [x, y] = P([lon, lat])
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${C.textSea}" stroke-width="1.2">
    <circle r="46"/><circle r="40" stroke-dasharray="2 4"/>
    <path d="M0,-58 L8,0 L0,58 L-8,0 Z" fill="${C.seaDeep}"/>
    <path d="M-58,0 L0,-6 L58,0 L0,6 Z" fill="${C.seaDeep}"/>
    <path d="M0,-58 L8,0 L-8,0 Z" fill="${C.textSea}"/>
    <text y="-66" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="${C.textSea}" stroke="none">${t('N', 'ش')}</text>
  </g>`
}

function scaleBar(lon, lat) {
  // 100 km ~ 0.9 deg of latitude
  const [x, y] = P([lon, lat])
  const len = 100 / 111.0 * KY * S
  return `<g transform="translate(${x} ${y})" font-family="Georgia, serif" font-size="13" fill="${C.text}">
    <rect width="${len / 2}" height="5" fill="${C.text}"/><rect x="${len / 2}" width="${len / 2}" height="5" fill="none" stroke="${C.text}"/>
    <text y="-8">0</text><text x="${len}" y="-8" text-anchor="middle">${t('100 km', '١٠٠ كم')}</text></g>`
}

// ---- assemble ---------------------------------------------------------------
const provinces = data.provinces
const T = `transform="translate(${(-kx(LON0) * S).toFixed(3)} ${(-ky(LAT0) * S).toFixed(3)}) scale(${S})"`
const provPaths = provinces.map(([id, name, d]) => `<path d="${d}"/>`).join('\n    ')

const trailD = smoothPath(TRAIL)
const cameraD = smoothPath(CAMERA)

const svg = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by tools/build-map.js – edit that file, not this one. -->
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${W}px" height="${H}px" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C.sea}"/>
${waves()}
<g ${T} fill="${C.shallow}" stroke="${C.shallow}" stroke-width="${(26 / S).toFixed(2)}" stroke-linejoin="round">
    ${provPaths}
</g>
<g ${T} fill="${C.land}" stroke="${C.landEdge}" stroke-width="${(5 / S).toFixed(2)}" stroke-linejoin="round">
    ${provPaths}
</g>
<g ${T} fill="${C.land}" stroke="none">
    ${provPaths}
</g>
<g ${T} fill="none" stroke="${C.border}" stroke-width="${(1.4 / S).toFixed(2)}" stroke-dasharray="${(6 / S).toFixed(2)} ${(5 / S).toFixed(2)}">
    ${provPaths}
</g>
${harrah()}
${peaks()}
${AR ? `
${label('البحر الأحمر', 38.2, 22.4, { size: 52, fill: C.textSea, rotate: -66, family: ARABIC_FONT })}
${label('الحجاز', 41.05, 23.0, { size: 64, fill: '#e3d4b1', rotate: -68, family: ARABIC_FONT })}
${label('تهامة', 38.82, 22.25, { size: 26, fill: '#d6c49c', rotate: -68, family: ARABIC_FONT })}
${label('حرة رهط', 40.15, 23.05, { size: 24, fill: C.harrahDot, rotate: -80, family: ARABIC_FONT })}
${label('جبال السروات', 40.48, 21.75, { size: 22, fill: C.mountain, rotate: -66, family: ARABIC_FONT })}` : `
${label('R E D &#160; S E A', 38.15, 22.55, { size: 40, fill: C.textSea, rotate: -66, spacing: 6, style: 'italic' })}
${label('البحر الأحمر', 38.45, 21.55, { size: 26, fill: C.textSea, rotate: -66, family: ARABIC_FONT })}
${label('A L - H I J A Z', 40.95, 23.25, { size: 44, fill: '#e3d4b1', rotate: -68, spacing: 10 })}
${label('الحجاز', 41.35, 22.35, { size: 34, fill: '#e3d4b1', rotate: -68, family: ARABIC_FONT })}
${label('T I H A M A H', 38.82, 22.25, { size: 18, fill: '#d6c49c', rotate: -68, spacing: 4 })}
${label('Harrat Rahat', 40.15, 23.05, { size: 16, fill: C.harrahDot, rotate: -80, style: 'italic' })}
${label('Sarawat Mountains', 40.48, 21.75, { size: 15, fill: C.mountain, rotate: -66, style: 'italic' })}`}
<g fill="${C.town}">
${TOWNS.map(([n, lon, lat]) => `  <circle cx="${X(lon)}" cy="${Y(lat)}" r="3.2"/>`).join('\n')}
</g>
${TOWNS.map(([n, lon, lat]) => label(n, lon, lat, { size: AR ? 17 : 13, fill: C.town, anchor: 'end', family: AR ? ARABIC_FONT : 'Arial, sans-serif' }).replace(/x="([\d.]+)" y="([\d.]+)"/, (m, x, y) => `x="${(+x - 8).toFixed(1)}" y="${(+y + 4).toFixed(1)}"`)).join('\n')}
${compass(37.95, 20.85)}
${scaleBar(41.4, 20.65)}
<g id="trail-path" display="none">
  <path display="inline" fill="none" stroke="#b39a6a" stroke-width="2" d="${trailD}"/>
</g>
<g id="camera-path" display="none">
  <path display="inline" fill="none" stroke="#EC2227" stroke-width="3" d="${cameraD}"/>
</g>
<g id="points" display="none">
${STOPS.map(([id, lon, lat, stay]) => `  <circle id="${AR ? STOP_AR[id] : id}"${stay ? ' data-stay="true"' : ''} display="inline" fill="#0f6b55" cx="${X(lon)}" cy="${Y(lat)}" r="6"/>`).join('\n')}
</g>
</svg>
`

const OUT = AR ? 'map-ar.svg' : 'map.svg'
fs.writeFileSync(path.join(ROOT, 'img', OUT), svg)
console.log(`img/${OUT} written: ${W} x ${H}px, ${(svg.length / 1024).toFixed(0)} KB`)

// Debug preview: same map with the hidden layers made visible
if (process.argv.includes('--debug')) {
  const dbg = svg
    .replace(/<g id="trail-path" display="none">/, '<g id="trail-path">')
    .replace(/<g id="camera-path" display="none">/, '<g id="camera-path" opacity="0.35">')
    .replace(/<g id="points" display="none">/, '<g id="points">')
    .replace(/stroke="#b39a6a" stroke-width="2"/, 'stroke="#b39a6a" stroke-width="3" stroke-dasharray="6 6"')
    .replace('</svg>', STOPS.map(([id, lon, lat]) => label(id, lon, lat, { size: 14, fill: '#0f6b55', anchor: 'start', family: 'Arial' }).replace(/x="([\d.]+)"/, (m, x) => `x="${+x + 10}"`)).join('\n') + '\n</svg>')
  fs.writeFileSync(path.join(ROOT, 'tools', AR ? 'map-debug-ar.svg' : 'map-debug.svg'), dbg)
  console.log(`tools/${AR ? 'map-debug-ar.svg' : 'map-debug.svg'} written`)
}

// Build the Arabic map too, unless this run was already the Arabic one
if (!AR) {
  require('child_process').execFileSync(process.execPath, [__filename, '--lang=ar', ...process.argv.slice(2)], { stdio: 'inherit' })
}
