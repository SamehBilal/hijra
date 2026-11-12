/* The story as an app: registers sw.js, adds an install button beside the language link
   (or the install steps on iPhone/iPad), says when a newer version is ready, when the
   connection drops or comes back, and keeps the browser bar's colour in step with the
   time of day. Loaded on both pages after js/story.js. */
(function () {
	'use strict';
	var html = document.documentElement;
	var ar = html.lang === 'ar';
	var L = function (arText, enText) { return ar ? arText : enText; };
	var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
	var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	var deferred = null;
	if (standalone) html.classList.add('is-app');

	/* ---------- notices ---------- */
	var stack = null;
	function notify(text, opts) {
		opts = opts || {};
		if (!stack) {
			stack = document.createElement('div');
			stack.className = 'toast-stack';
			stack.setAttribute('role', 'status');
			stack.setAttribute('aria-live', 'polite');
			document.body.appendChild(stack);
		}
		var box = document.createElement('div');
		box.className = 'toast' + (opts.type ? ' toast--' + opts.type : '');
		box.innerHTML = (opts.title ? '<strong class="toast__title">' + opts.title + '</strong>' : '') + '<p>' + text + '</p>' +
			'<button type="button" class="toast__close" aria-label="' + L('إغلاق', 'Close') + '">×</button>';
		stack.appendChild(box);
		var timer = 0;
		var api = {
			el: box,
			dismiss: function () {
				clearTimeout(timer);
				box.classList.add('toast--out');
				setTimeout(function () { box.remove(); }, 300);
			}
		};
		box.querySelector('.toast__close').addEventListener('click', api.dismiss);
		var ttl = opts.ttl === undefined ? 5000 : opts.ttl;
		if (ttl) timer = setTimeout(api.dismiss, ttl);
		return api;
	}

	/* ---------- the browser bar follows the time of day ---------- */
	var BAR = { night: '#0b1426', morning: '#f3d2a8', day: '#faf4e6' };
	function syncThemeColor() {
		var m = document.querySelector('meta[name="theme-color"]');
		if (m) m.setAttribute('content', BAR[document.body.getAttribute('data-time')] || BAR.night);
	}
	new MutationObserver(syncThemeColor).observe(document.body, { attributes: true, attributeFilter: ['data-time'] });
	syncThemeColor();

	/* ---------- install ---------- */
	var ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
	function canOffer() { return !standalone && (deferred || ios); }
	function placeButton() {
		var header = document.querySelector('.story-header');
		if (!header) return;
		var b = header.querySelector('.install-app');
		if (!canOffer()) { if (b) b.remove(); return; }
		if (b) return;
		b = document.createElement('button');
		b.type = 'button';
		b.className = 'install-app';
		b.innerHTML = ICON + '<span>' + L('ثبّت التطبيق', 'Install app') + '</span>';
		b.title = L('ثبّت القصة كتطبيق على جهازك', 'Install the story as an app');
		b.addEventListener('click', install);
		header.appendChild(b);
	}
	function install() {
		if (deferred) {
			deferred.prompt();
			deferred.userChoice.then(function () { deferred = null; placeButton(); });
			return;
		}
		if (ios) {
			notify(L('في سفاري: اضغط زر المشاركة <b>⎋</b> ثم «إضافة إلى الشاشة الرئيسية».',
				'In Safari, tap Share <b>⎋</b>, then “Add to Home Screen”.'), { title: L('ثبّت القصة', 'Install the story'), ttl: 9000 });
		}
	}
	window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); deferred = ev; placeButton(); });
	/* A phone sends appinstalled as soon as the install is accepted (while it is still adding the icon) and often again when
	   it is there: say it is on its way, then that it is there (or ten seconds later if no second event comes) — once. */
	var installing = null, wait = 0, told = false;
	function done() {
		if (told) return;
		told = true; clearTimeout(wait);
		if (installing) installing.dismiss();
		notify(L('صارت القصة على شاشتك الرئيسية.', 'The Hijra is on your home screen now.'), { type: 'success' });
	}
	var mobile = /android|mobi/i.test(navigator.userAgent);
	window.addEventListener('appinstalled', function () {
		deferred = null; standalone = true; placeButton();
		if (told) return;
		if (!mobile || installing) return done();
		installing = notify(L('تُضاف القصة إلى شاشتك الآن… لحظات.', 'Adding the Hijra to your home screen… a moment.'), { ttl: 10000 });
		wait = setTimeout(done, 10000);
	});
	placeButton();

	/* ---------- connection ---------- */
	window.addEventListener('offline', function () {
		notify(L('انقطع الاتصال. القصة محفوظة على جهازك وتعمل دون إنترنت.', 'You’re offline. The story is saved on this device and still works.'), { type: 'warning', ttl: 6000 });
	});
	window.addEventListener('online', function () {
		notify(L('عاد الاتصال.', 'Back online.'), { type: 'success', ttl: 2500 });
	});

	/* ---------- service worker and updates ---------- */
	if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
	var reloading = false;
	navigator.serviceWorker.addEventListener('controllerchange', function () { if (reloading) location.reload(); });
	function offerUpdate(worker) {
		var n = notify(L('نسخة أحدث من القصة جاهزة. <button type="button" class="toast__action">حدّث الآن</button>',
			'A newer version of the story is ready. <button type="button" class="toast__action">Update now</button>'), { title: L('تحديث', 'Update'), ttl: 0 });
		n.el.querySelector('.toast__action').addEventListener('click', function () { reloading = true; worker.postMessage('skipWaiting'); n.dismiss(); });
	}
	window.addEventListener('load', function () {
		navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
			if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
			reg.addEventListener('updatefound', function () {
				var w = reg.installing;
				if (!w) return;
				w.addEventListener('statechange', function () {
					/* only an update, not the first install */
					if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
				});
			});
			/* look for a new version when the app comes back to the front */
			document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
		}).catch(function () {});
	});
})();
