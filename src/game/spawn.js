import { MAP_W, baseMap } from './constants.js';
import { idx, tileAt, collide } from './utils.js';

export function spawnEnemies(n){
  const arr=[]; let tries=0;
  while(arr.length<n && tries<2000){
    tries++;
    const x=2+Math.random()*(MAP_W-4), y=2+Math.random()*(MAP_W-4);
    if(tileAt(x,y)!==0) continue;
    const baseG = 180 + Math.floor(Math.random()*60);
    arr.push({
      x,y,
      hp:60, alive:true,
      cool: 0.5 + Math.random()*0.8,
      speed: 0.7 + Math.random()*0.9,
      zBase: (Math.random()*0.30 - 0.05),
      bobAmp: 0.12 + Math.random()*0.16,
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

export function spawnExplosion(state, x, y, color){
  const n = 24 + Math.floor(Math.random()*16);
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 2.0 + Math.random()*3.5;
    const h0 = 0.30 + Math.random()*0.35;
    const vh0 = 1.2 + Math.random()*1.3;
    state.particles.push({
      x: x + Math.cos(a)*0.02,
      y: y + Math.sin(a)*0.02,
      vx: Math.cos(a)*sp,
      vy: Math.sin(a)*sp,
      h: h0,
      vh: vh0,
      ttl: 0.9 + Math.random()*0.7,
      size: 0.10 + Math.random()*0.18,
      color,
    });
  }
}