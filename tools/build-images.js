// Renders the app's images with a headless browser (Edge or Chrome, already on the machine):
//   img/icons/*.png      app icons, from img/icons/icon.svg, maskable.svg and favicon.svg
//   img/screens/*.jpg    the install screenshots listed in manifest.webmanifest
//   img/og/*.jpg         the pictures shown when a link to the story is shared
//
//   node tools/build-images.js            everything
//   node tools/build-images.js icons      only the icons (also: screens, og)
//
// It starts tools/serve.js on port 8099, drives the browser over the DevTools protocol,
// and scrolls the real pages to the sections listed in SCREENS below.
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..')
const PORT = 8099, DEBUG_PORT = 9333
const SITE = `http://localhost:${PORT}/`
const only = process.argv[2]

const BROWSERS = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean)

const ICONS = [
  ['icon.svg', 'icon-192.png', 192], ['icon.svg', 'icon-512.png', 512],
  ['maskable.svg', 'maskable-192.png', 192], ['maskable.svg', 'maskable-512.png', 512],
  // iOS rounds the corners itself and doesn't like transparency: use the full-bleed version
  ['maskable.svg', 'apple-touch-icon.png', 180],
  ['favicon.svg', 'favicon-32.png', 32], ['favicon.svg', 'favicon-48.png', 48],
]

// [file, page, section index (-1 = top of the page), how far into the section, width, height, mobile]
const SCREENS = [
  ['wide-home.jpg', 'index.html', -1, 0, 1280, 720, false],
  ['wide-cave.jpg', 'index.html', 1, 0.22, 1280, 720, false],
  ['wide-qudayd.jpg', 'index.html', 4, 0.3, 1280, 720, false],
  ['wide-arabic.jpg', 'ar.html', 7, 0.25, 1280, 720, false],
  ['narrow-home.jpg', 'index.html', -1, 0, 412, 915, true],
  ['narrow-arabic.jpg', 'ar.html', 1, 0.3, 412, 915, true],
  ['narrow-quba.jpg', 'index.html', 7, 0.22, 412, 915, true],
]
const OG = [
  ['og-en.jpg', 'index.html'],
  ['og-ar.jpg', 'ar.html'],
]

const sleep = ms => new Promise(r => setTimeout(r, ms))
// DEBUG=1 prints each step (written synchronously, so nothing is lost if the run is stopped)
const debug = (...a) => { if (process.env.DEBUG) fs.writeSync(2, a.join(' ') + '\n') }
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b)) } catch (e) { reject(e) } }) }).on('error', reject)
})

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const waiting = new Map(), listeners = []
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data)
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id); waiting.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    } else if (msg.method) listeners.forEach(l => l(msg))
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id; waiting.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params }))
  })
  const once = method => new Promise(resolve => {
    const l = msg => { if (msg.method === method) { listeners.splice(listeners.indexOf(l), 1); resolve(msg.params) } }
    listeners.push(l)
  })
  return new Promise((resolve, reject) => { ws.onopen = () => resolve({ send, once, close: () => ws.close() }); ws.onerror = reject })
}

async function main() {
  const browser = BROWSERS.find(p => fs.existsSync(p))
  if (!browser) throw new Error('No Edge or Chrome found; set BROWSER=/path/to/browser')

  const server = spawn(process.execPath, [path.join(__dirname, 'serve.js')], { env: { ...process.env, PORT }, stdio: 'ignore' })
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hijra-capture-'))
  const chrome = spawn(browser, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' })

  debug('browser:', browser, 'profile:', profile)
  let page
  try {
    let targets
    for (let i = 0; i < 100 && !(targets && targets.some(t => t.type === 'page')); i++) {
      await sleep(250)
      targets = await getJSON(`http://127.0.0.1:${DEBUG_PORT}/json/list`).catch(() => null)
      debug('targets:', targets ? targets.map(t => t.type).join(',') : 'none')
    }
    if (!targets) throw new Error('The browser did not open its debugging port')
    const target = targets.find(t => t.type === 'page')
    debug('page:', target.webSocketDebuggerUrl)
    page = await cdp(target.webSocketDebuggerUrl)
    debug('connected')
    await page.send('Page.enable')
    await page.send('Runtime.enable')

    const viewport = (width, height, mobile = false) => page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    // (a page that is already loaded may not fire the event again, so don't wait forever)
    const go = async url => { const loaded = page.once('Page.loadEventFired'); await page.send('Page.navigate', { url }); await Promise.race([loaded, sleep(8000)]) }
    const evaluate = expression => page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).then(r => r.result.value)
    const save = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(data, 'base64')); console.log(path.relative(ROOT, file)) }

    if (!only || only === 'icons') {
      await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
      for (const [src, out, size] of ICONS) {
        await viewport(size, size)
        // open the SVG itself and size it to the icon
        await go(`${SITE}img/icons/${src}`)
        debug('icon', out)
        await evaluate(`(() => { const s = document.documentElement; s.setAttribute('width', ${size}); s.setAttribute('height', ${size}); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) })()`)
        const shot = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } })
        save(path.join(ROOT, 'img/icons', out), shot.data)
      }
      await page.send('Emulation.setDefaultBackgroundColorOverride', {})
    }

    // Scroll to a section and give the map time to fly there and the theme to fade
    const show = async (url, section, fraction) => {
      await go(url)
      await evaluate('document.fonts.ready.then(() => new Promise(r => setTimeout(r, 1500)))')
      if (section >= 0) {
        await evaluate(`new Promise(r => {
          const s = document.querySelectorAll('.js-section')[${section}], b = s.getBoundingClientRect()
          window.scrollTo(0, b.top + scrollY + b.height * ${fraction})
          let n = 0; const t = setInterval(() => { window.scrollBy(0, n % 2 ? -1 : 1); if (++n > 8) { clearInterval(t); r() } }, 250)
        })`)
      }
      await sleep(3500)
      // the browser offers to install the app; that button and any notice don't belong in the pictures
      await evaluate(`document.querySelectorAll('.install-app, .toast-stack').forEach(e => e.style.display = 'none')`)
    }

    if (!only || only === 'screens') {
      for (const [out, url, section, fraction, w, h, mobile] of SCREENS) {
        await viewport(w, h, mobile)
        await show(SITE + url, section, fraction)
        const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82 })
        save(path.join(ROOT, 'img/screens', out), shot.data)
      }
    }

    if (!only || only === 'og') {
      for (const [out, url] of OG) {
        await viewport(1200, 630)
        await show(SITE + url, -1, 0)
        await evaluate(`document.querySelectorAll('.scroll-hint, .lang-switch').forEach(e => e.style.display = 'none')`)
        const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
        save(path.join(ROOT, 'img/og', out), shot.data)
      }
    }
  } finally {
    if (page) page.close()
    chrome.kill(); server.kill()
    await sleep(500)
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 })
  }
}

main().catch(e => { console.error(e); process.exit(1) })
