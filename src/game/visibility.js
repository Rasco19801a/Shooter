import { STEP } from './constants.js';
import { isWall } from './map.js';

export function visible(x0, y0, x1, y1){
  const dx=x1-x0, dy=y1-y0; const dist=Math.hypot(dx,dy); const steps=Math.ceil(dist/STEP);
  for(let i=1;i<steps;i++){
    const t=i/steps; const x=x0+dx*t, y=y0+dy*t; if(isWall(x,y)) return false;
  }
  return true;
}