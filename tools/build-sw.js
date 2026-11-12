// Rewrites PRECACHE and VERSION in sw.js: the pages, code, styles, maps, icons and photos,
// so the whole story reads offline after the first visit. The version is a hash of those
// files, so any change makes installed copies offer "update now".
// Run from the repo root after changing files:  node tools/build-sw.js
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const root = path.resolve(__dirname, '..')

const list = ['./']
const add = rel => list.push(rel.split(path.sep).join('/'))
fs.readdirSync(root).filter(f => /\.html$/.test(f)).sort().forEach(add)
add('manifest.webmanifest')
const walk = (dir, test) => {
  if (!fs.existsSync(path.join(root, dir))) return
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).forEach(d => {
    const rel = path.join(dir, d.name)
    if (d.isDirectory()) walk(rel, test); else if (test(rel)) add(rel)
  })
}
walk('css', f => /\.css$/.test(f))
walk('js', f => /\.js$/.test(f))
walk('dist', f => /\.js$/.test(f))
// the maps, the travel marker, the icons and the photos (not the install screenshots or share pictures)
walk('img', f => /\.(svg|png|jpe?g)$/.test(f) && !/^img[\\/](screens|og)[\\/]/.test(f))

const hash = crypto.createHash('sha1')
list.slice(1).forEach(f => hash.update(f).update(fs.readFileSync(path.join(root, f))))
const version = 'hijra-' + hash.digest('hex').slice(0, 10)

const swPath = path.join(root, 'sw.js')
let sw = fs.readFileSync(swPath, 'utf8')
sw = sw.replace(/var VERSION = '[^']*';/, "var VERSION = '" + version + "';")
  .replace(/var PRECACHE = \[[\s\S]*?\n\];/, 'var PRECACHE = [\n' + list.map(f => "\t'" + f + "'").join(',\n') + '\n];')
fs.writeFileSync(swPath, sw)
console.log(version, list.length, 'files')
