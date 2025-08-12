import { STEP, PITCH_LIMIT, baseMap } from './constants.js';
import { clamp, collide, idx } from './utils.js';
import { trySlide } from './spawn.js';

export function update(state, dt){
  const p=state.player;
  const f={x:Math.cos(p.dir), y:Math.sin(p.dir)};
  const r={x:Math.cos(p.dir+Math.PI/2), y:Math.sin(p.dir+Math.PI/2)};

  let mx=0,my=0;
  if(state.keys['KeyW']){mx+=f.x; my+=f.y;}
  if(state.keys['KeyS']){mx-=f.x; my-=f.y;}
  if(state.keys['KeyA']){mx-=r.x; my-=r.y;}
  if(state.keys['KeyD']){mx+=r.x; my+=r.y;}
  mx+=state.moveVec.x; my+=state.moveVec.y;
  const isCurrentlyMoving = Math.hypot(mx, my) > 0.001;
  state.isMoving = isCurrentlyMoving;
  const len=Math.hypot(mx,my)||1; mx/=len; my/=len;
  const baseSpeed = 2.6;
  const walkOsc = (Math.abs(mx)+Math.abs(my))>0.001 ? (0.06*Math.sin(state.last*0.02)) : 0;
  const step=(baseSpeed+walkOsc)*dt;
  let nx=p.x+mx*step, ny=p.y+my*step;
  if(!collide(nx,p.y)) p.x=nx; else trySlide(p, nx, p.y);
  if(!collide(p.x,ny)) p.y=ny; else trySlide(p, p.x, ny);

  if(state.keys['ArrowLeft']) p.dir -= 1.8*dt;
  if(state.keys['ArrowRight']) p.dir += 1.8*dt;
  const sensX = 3.0, sensY = 0.9;
  p.dir   += state.turnStickX * sensX * dt;
  p.pitch += state.turnStickY * sensY * dt;
  p.pitch = clamp(p.pitch, -PITCH_LIMIT, PITCH_LIMIT);
  if (Math.abs(state.turnStickY) < 0.001 && !state.keys['ArrowUp'] && !state.keys['ArrowDown']) {
    p.pitch *= (1 - Math.min(1, 1.5*dt));
  }

  // Door/exit tile check -> go outside
  const gx=Math.floor(p.x), gy=Math.floor(p.y);
  if(!state.outside){
    if(baseMap[idx(gx,gy)]===2){
      state.outside = true;
    }
  }
}

export function initState(){
  return {
    player: { x:2.5, y:2.5, dir:0, pitch:0, fov: Math.PI/3, speed:2.6 },
    last: performance.now(),
    keys:{},
    moveVec:{x:0,y:0},
    turnStickX:0,
    turnStickY:0,
    won:false,
    isMoving:false,
    outside:false,
  };
}