// Page helpers shared by index.html and ar.html (load after dist/app.js).
(function () {
	var sections = [].slice.call(document.querySelectorAll('.js-section'))

	// Time of day: each .js-section has data-time="night" | "morning" | "day".
	// The section that has reached the middle of the screen sets the theme
	// on <body data-time="...">; css/style.css does the rest.
	function updateTime() {
		var line = window.innerHeight * 0.55
		var time = 'night' // header and intro are at night
		for (var i = 0; i < sections.length; i++) {
			if (sections[i].getBoundingClientRect().top < line) time = sections[i].getAttribute('data-time') || time
		}
		if (document.body.getAttribute('data-time') !== time) document.body.setAttribute('data-time', time)
	}
	window.addEventListener('scroll', updateTime, { passive: true })
	window.addEventListener('resize', updateTime)
	updateTime()

	// Web fonts and photos change the height of the text after the map has
	// measured it; a resize event makes the map re-measure every section.
	function remeasure() { window.dispatchEvent(new Event('resize')) }
	window.addEventListener('load', remeasure)
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure)
})()
