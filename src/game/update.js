import { STEP, PITCH_LIMIT, baseMap, MAP_W, MAP_H } from './constants.js';
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
  if(state.outside){
    p.x = nx; p.y = ny;
  } else {
    if(!collide(nx,p.y)) p.x=nx; else trySlide(p, nx, p.y);
    if(!collide(p.x,ny)) p.y=ny; else trySlide(p, p.x, ny);
  }

  // Smooth yaw for keys/touch look; mouse-look still adds directly elsewhere
  const sensX = 3.0, sensY = 0.9;
  let yawInput = 0;
  if(state.keys['ArrowLeft']) yawInput -= 1.8; // rad/s
  if(state.keys['ArrowRight']) yawInput += 1.8; // rad/s
  yawInput += state.turnStickX * sensX; // rad/s from virtual stick
  const k = Math.min(1, 12*dt);
  state.yawVel = state.yawVel || 0;
  state.yawVel += (yawInput - state.yawVel) * k;
  if(Math.abs(yawInput) < 0.001 && Math.abs(state.yawVel) < 0.001) state.yawVel = 0;
  p.dir += state.yawVel * dt;

  p.pitch += state.turnStickY * sensY * dt;
  p.pitch = clamp(p.pitch, -PITCH_LIMIT, PITCH_LIMIT);
  if (Math.abs(state.turnStickY) < 0.001 && !state.keys['ArrowUp'] && !state.keys['ArrowDown']) {
    p.pitch *= (1 - Math.min(1, 1.5*dt));
  }

  // Door/exit logic
  const gx=Math.floor(p.x), gy=Math.floor(p.y);
  const nowMs = state.last || performance.now();
  const ready = !state.doorCooldownUntil || nowMs >= state.doorCooldownUntil;

  if(!state.outside){
    // Enter outside when on exit tile (2), with a short cooldown to prevent bounce
         if(baseMap[idx(gx,gy)]===2 && ready){
       state.lastInside = { x:p.x, y:p.y, dir:p.dir, pitch:p.pitch };
       state.doorBack = { x:p.x, y:p.y };
       // Place a safe return position one step inward from the exit
       state.returnInsidePos = { x: Math.max(1.5, p.x - 1), y: p.y };
       state.outside = true;
       state.outsideCenter = null;
       state.outsideRadius = null;
       state.outsideStones = [];
       state.outsideInnerRadius = null;
       state.doorCooldownUntil = nowMs + 800;
     }
  } else {
    // When outside, going near the door brings you back inside
    if(state.doorBack){
      const dx = state.doorBack.x - p.x;
      const dy = state.doorBack.y - p.y;
      const dist = Math.hypot(dx, dy);
      if(dist < 0.55 && ready){
        state.outside = false;
        // Move to a safe position just inside
        const target = state.returnInsidePos || state.lastInside || { x: p.x - 1, y: p.y };
        p.x = target.x; p.y = target.y;
        // Nudge if colliding
        if(collide(p.x, p.y)){
          trySlide(p, p.x + 0.1, p.y) || trySlide(p, p.x - 0.1, p.y) || trySlide(p, p.x, p.y + 0.1) || trySlide(p, p.x, p.y - 0.1);
        }
        state.doorCooldownUntil = nowMs + 800;
      }
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
    // Door/back-inside helpers
    doorBack: null,
    lastInside: null,
    returnInsidePos: null,
    doorCooldownUntil: 0,
    yawVel: 0,
    // Outside helpers
    outsideCenter: null,
    outsideRadius: null,
    outsideInnerRadius: null,
    outsideStones: [],
  };
}