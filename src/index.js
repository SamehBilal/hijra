import 'babel-polyfill'
import CanvasMap from './canvas-map'

let map=CanvasMap({
  textContainer:document.querySelector('.text'),
  mapSrc:document.body.getAttribute('data-map') || 'img/map.svg',
  trailVisitedColor:'#0f6b55',
  fontPresentColor:'#3d3a32',
}).appendTo('.container')
