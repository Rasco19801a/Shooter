import { tileAt } from './map.js';

export function spawnEnemies(n){
  const arr=[]; let tries=0;
  while(arr.length<n && tries<2000){
    tries++;
    const x=2+Math.random()*(16-4), y=2+Math.random()*(16-4);
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