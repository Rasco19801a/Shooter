import { isWall } from './map.js';

export function collide(px, py, radius = 0.18){
  const steps = 10;
  for(let i=0;i<steps;i++){
    const a = i/steps*Math.PI*2;
    const sx = px + Math.cos(a)*radius;
    const sy = py + Math.sin(a)*radius;
    if(isWall(sx,sy)) return true;
  }
  return false;
}

export function trySlide(entity, nx, ny, radius = 0.18){
  if(!collide(nx, entity.y, radius)) { entity.x = nx; return true; }
  if(!collide(entity.x, ny, radius)) { entity.y = ny; return true; }
  return false;
}

export function resolveEnemyOverlaps(enemies){
  for(let i=0;i<enemies.length;i++){
    const a = enemies[i]; if(!a.alive) continue;
    for(let j=i+1;j<enemies.length;j++){
      const b = enemies[j]; if(!b.alive) continue;
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