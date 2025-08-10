import { MAP_W, MAP_H, baseMap } from './constants.js';

export function idx(x, y){ return y * MAP_W + x; }
export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
export function tileAt(px, py){ const gx = Math.floor(px), gy = Math.floor(py); if(gx<0||gy<0||gx>=MAP_W||gy>=MAP_H) return 1; return baseMap[idx(gx,gy)]; }
export function isWall(px, py){ return tileAt(px, py) === 1; }
export function collide(px, py, radius = 0.18){
  const steps=10; for(let i=0;i<steps;i++){ const a=i/steps*Math.PI*2; const sx=px+Math.cos(a)*radius, sy=py+Math.sin(a)*radius; if(isWall(sx,sy)) return true; } return false;
}

export function visible(x0, y0, x1, y1, step){
  const dx = x1-x0, dy = y1-y0; const dist = Math.hypot(dx,dy); const steps = Math.ceil(dist/(step||0.02));
  for(let i=1;i<steps;i++){ const t=i/steps; const x=x0+dx*t, y=y0+dy*t; if(isWall(x,y)) return false; }
  return true;
}