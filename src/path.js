import {sub} from "./vector"
import {clamp} from "./math2"

export function getPointAtLength(path,length){
  let p=path.getPointAtLength(length)
  return {x:p.x, y:p.y}
}
export function getLength(path){
  return path.getTotalLength()
}
export function getPointAtPercent(path,percent){
  if(Array.isArray(path))
    return path[Math.round(clamp(percent)*(path.length-1))]

  return getPointAtLength(path,percent*getLength(path))
}
function distance(pointA,pointB){
  let d=sub(pointA,pointB)
  return Math.sqrt((d.x*d.x)+(d.y*d.y))
}
// Length along the path of the point closest to `point`.
// Scans the whole path densely, then refines, so stops on long winding
// routes are never matched to the wrong stretch of the path.
export function getLengthAtPoint(path,point,step=2){
  let pathLength=getLength(path)
  let best=0, bestDistance=Infinity
  let test=length=>{
    let d=distance(point,getPointAtLength(path,length))
    if(d<bestDistance){ bestDistance=d; best=length }
  }
  for(let l=0; l<=pathLength; l+=step) test(l)
  let from=Math.max(0,best-step), to=Math.min(pathLength,best+step)
  for(let l=from; l<=to; l+=step/20) test(l)
  return best
}
export function subdividePath(path,subdivisions,subdivideByDistance=false){
  let length=getLength(path)

  if(subdivideByDistance) subdivisions=length/subdivisions

  let subdivisionLength=length/subdivisions
  return Array.from(Array(Math.floor(subdivisions)))
    .map((cur,i)=>getPointAtLength(path,i*subdivisionLength))
}
