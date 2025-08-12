import { MAP_W, baseMap } from './constants.js';
import { idx, tileAt, collide } from './utils.js';

export function spawnEnemies(n){
  const arr=[]; let tries=0;
  while(arr.length<n && tries<2000){
    tries++;
    const cx = MAP_W * 0.5, cy = MAP_H * 0.5;
    const spread = Math.max(2.5, Math.min(MAP_W, MAP_H) * 0.28);
    const x = Math.max(1.5, Math.min(MAP_W-1.5, cx + (Math.random()*2-1) * spread));
    const y = Math.max(1.5, Math.min(MAP_H-1.5, cy + (Math.random()*2-1) * spread));
    if(tileAt(x,y)!==0) continue;
    const baseG = 180 + Math.floor(Math.random()*60);
    arr.push({
      x,y,
      hp:60, alive:true,
      cool: 0.5 + Math.random()*0.8,
      speed: 0.7 + Math.random()*0.9,
      zBase: 0.05 + Math.random()*0.25,  // Increased range: 0.05 to 0.30 (was 0.14 to 0.17)
      bobAmp: 0.02 + Math.random()*0.04,  // Increased range: 0.02 to 0.06 (was 0.010 to 0.025)
      t: Math.random()*10,
      rot: Math.random()*Math.PI*2,
      rotSpd: (Math.random()*1.5 + 0.5) * (Math.random()<0.5?-1:1),
      sizeMul: 0.32 + Math.random()*0.12,
      color: `rgb(${baseG},${baseG},${baseG})`,
      rad: 0.28,
    });
  }
  return arr;
}

export function trySlide(entity, nx, ny, radius=0.18){
  if(!collide(nx, entity.y, radius)) { entity.x = nx; return true; }
  if(!collide(entity.x, ny, radius)) { entity.y = ny; return true; }
  return false;
}

export function resolveEnemyOverlaps(enemies){
  for(let i=0;i<enemies.length;i++){
    const a=enemies[i]; if(!a.alive) continue;
    for(let j=i+1;j<enemies.length;j++){
      const b=enemies[j]; if(!b.alive) continue;
      const dx=b.x-a.x, dy=b.y-a.y; const d2=dx*dx+dy*dy; const minDist=(a.rad||0.28)+(b.rad||0.28);
      if(d2>0 && d2 < minDist*minDist){
        const d=Math.sqrt(d2)||0.0001; const ux=dx/d, uy=dy/d; const overlap=minDist-d;
        const ax=a.x - ux*overlap*0.5, ay=a.y - uy*overlap*0.5;
        const bx=b.x + ux*overlap*0.5, by=b.y + uy*overlap*0.5;
        if(!collide(ax,ay,a.rad)) { a.x=ax; a.y=ay; }
        if(!collide(bx,by,b.rad)) { b.x=bx; b.y=by; }
      }
    }
  }
}

export function spawnExplosion(state, x, y, color, heightAtExplosion){
  const n = 28 + Math.floor(Math.random()*18);
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 2.2 + Math.random()*3.8;
    const h0 = (typeof heightAtExplosion === 'number') ? Math.max(0, heightAtExplosion) : (0.12 + Math.random()*0.10);
    state.particles.push({
      x: x + Math.cos(a)*0.06,
      y: y + Math.sin(a)*0.06,
      vx: Math.cos(a)*sp,
      vy: Math.sin(a)*sp,
      h: h0,
      vh: 0,
      ttl: 0.9 + Math.random()*0.9,
      size: 0.08 + Math.random()*0.16,
      color,
      noGravity: true,
    });
  }
}