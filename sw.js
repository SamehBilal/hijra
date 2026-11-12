/* Service worker: the story works offline and installs as an app.
   - Pages: network first (3 s), then the saved copy, then offline.html.
   - The story's own files (code, styles, maps, photos) are saved at install, so the whole
     story reads offline after the first visit.
   - Everything is served from this version's saved copy first; a new version (see VERSION)
     replaces all saved copies when it takes over, so an update never mixes old and new files.
   - Other images: from the cache once seen. Google Fonts: from the cache, refreshed in the background.
   VERSION and PRECACHE are rewritten by tools/build-sw.js — run it after changing files. */
'use strict';

var VERSION = 'hijra-53cdfb8636';
var PRECACHE = [
	'./',
	'ar.html',
	'index.html',
	'offline.html',
	'manifest.webmanifest',
	'css/normalize.css',
	'css/style.css',
	'js/pwa.js',
	'js/story.js',
	'dist/app.js',
	'img/caravan.svg',
	'img/icons/apple-touch-icon.png',
	'img/icons/favicon-32.png',
	'img/icons/favicon-48.png',
	'img/icons/favicon.svg',
	'img/icons/icon-192.png',
	'img/icons/icon-512.png',
	'img/icons/icon.svg',
	'img/icons/maskable-192.png',
	'img/icons/maskable-512.png',
	'img/icons/maskable.svg',
	'img/map-ar.svg',
	'img/map.svg',
	'img/photos/bedouin-tent-sargent.jpg',
	'img/photos/harrat-rahat.jpg',
	'img/photos/jabal-thawr.jpg',
	'img/photos/makkah-night.jpg',
	'img/photos/masjid-nabawi.jpg',
	'img/photos/nabawi-original-plan.jpg',
	'img/photos/quba-mosque.jpg',
	'img/photos/red-sea.jpg',
	'img/photos/sand-dunes.jpg',
	'img/photos/thawr-rocks.jpg'
];

var SHELL = 'hijra-shell-' + VERSION;
var RUNTIME = 'hijra-runtime';
var IMAGES = 'hijra-images';
var FONTS = 'hijra-fonts';

self.addEventListener('install', function (ev) {
	ev.waitUntil(caches.open(SHELL).then(function (c) {
		/* one missing file shouldn't stop the whole install */
		return Promise.all(PRECACHE.map(function (u) {
			return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
		}));
	}));
});

self.addEventListener('activate', function (ev) {
	ev.waitUntil(caches.keys().then(function (keys) {
		/* a new version replaces every saved copy of the story's files (the fonts stay) */
		return Promise.all(keys.filter(function (k) { return k.indexOf('hijra-') === 0 && k !== SHELL && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
	}).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (ev) {
	if (ev.data === 'skipWaiting') self.skipWaiting();
});

function timeout(ms, p) {
	return new Promise(function (resolve, reject) {
		var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
		p.then(function (r) { clearTimeout(t); resolve(r); }, function (e) { clearTimeout(t); reject(e); });
	});
}

/* this version's copy of one of the story's files, saved at install */
function fromShell(req) {
	return caches.open(SHELL).then(function (c) { return c.match(req, { ignoreSearch: true }); });
}

function page(req) {
	var net = fetch(req).then(function (res) {
		if (res && res.ok) {
			var copy = res.clone();
			/* one copy per page, without the query (?source=pwa) */
			var url = new URL(req.url); url.search = '';
			caches.open(RUNTIME).then(function (c) { c.put(url.href, copy); });
		}
		return res;
	});
	return timeout(3000, net).catch(function () {
		return fromShell(req).then(function (hit) {
			return hit || caches.match(req, { ignoreSearch: true });
		}).then(function (hit) {
			return hit || net.catch(function () { return fromShell('offline.html'); });
		});
	});
}

function staleWhileRevalidate(req, cacheName) {
	return caches.open(cacheName).then(function (c) {
		return c.match(req, { ignoreSearch: req.url.indexOf(self.location.origin) === 0 }).then(function (hit) {
			var net = fetch(req).then(function (res) {
				if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
				return res;
			}).catch(function () { return hit; });
			return hit || net;
		});
	});
}

function cacheFirst(req, cacheName) {
	return fromShell(req).then(function (hit) {
		return hit || caches.open(cacheName).then(function (c) { return c.match(req, { ignoreSearch: true }); });
	}).then(function (hit) {
		if (hit) return hit;
		return fetch(req).then(function (res) {
			if (res && (res.ok || res.type === 'opaque')) {
				var copy = res.clone();
				caches.open(cacheName).then(function (c) { c.put(req, copy); });
			}
			return res;
		}).catch(function () { return new Response('', { status: 504 }); });
	});
}

self.addEventListener('fetch', function (ev) {
	var req = ev.request;
	if (req.method !== 'GET') return;
	var url = new URL(req.url);
	var same = url.origin === self.location.origin;

	if (req.mode === 'navigate') { ev.respondWith(page(req)); return; }
	if (same && /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname)) { ev.respondWith(cacheFirst(req, IMAGES)); return; }
	if (same) {
		/* this version's copy, else the last one fetched (refreshed quietly each time) */
		ev.respondWith(fromShell(req).then(function (hit) {
			return hit || staleWhileRevalidate(req, RUNTIME);
		}));
		return;
	}
	if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { ev.respondWith(staleWhileRevalidate(req, FONTS)); return; }
});
