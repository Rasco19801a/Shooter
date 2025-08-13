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

// Circle vs oriented box (2D) for outside stone collision
export function circleIntersectsOBB(cx, cy, radius, rect){
  const dx = cx - rect.x; const dy = cy - rect.y;
  const c = Math.cos(rect.yaw); const s = Math.sin(rect.yaw);
  // rotate world vector into rect local space (by -yaw)
  const lx = dx * c + dy * s;
  const ly = -dx * s + dy * c;
  const clx = clamp(lx, -rect.hw, rect.hw);
  const cly = clamp(ly, -rect.hd, rect.hd);
  const rx = lx - clx; const ry = ly - cly;
  return (rx*rx + ry*ry) <= (radius*radius);
}

export function collideOutside(px, py, stones, radius=0.18, stoneSize){
  if(!stones || stones.length===0) return false;
  const hw = (stoneSize?.w ?? 0.6) / 2;
  const hd = (stoneSize?.d ?? 0.6) / 2;
  for(const s of stones){
    if(circleIntersectsOBB(px, py, radius, { x: s.x, y: s.y, yaw: s.worldYaw, hw, hd })) return true;
  }
  return false;
}