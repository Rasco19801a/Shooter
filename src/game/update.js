import { STEP, PITCH_LIMIT } from './constants.js';
import { clamp, collide, isWall, idx } from './utils.js';
import { spawnEnemies, trySlide, resolveEnemyOverlaps, spawnExplosion } from './spawn.js';
import { visible } from './utils.js';
import { spawnProjectile, tryShoot } from './combat.js';
import { baseMap } from './constants.js';
import { integrateParticle } from './physics.js';

export function update(state, dt, setHud){
  const p=state.player;
  const f={x:Math.cos(p.dir), y:Math.sin(p.dir)};
  const r={x:Math.cos(p.dir+Math.PI/2), y:Math.sin(p.dir+Math.PI/2)};

  let mx=0,my=0;
  if(state.keys['KeyW']){mx+=f.x; my+=f.y;}
  if(state.keys['KeyS']){mx-=f.x; my-=f.y;}
  if(state.keys['KeyA']){mx-=r.x; my-=r.y;}
  if(state.keys['KeyD']){mx+=r.x; my+=r.y;}
  mx+=state.moveVec.x; my+=state.moveVec.y;
  const len=Math.hypot(mx,my)||1; mx/=len; my/=len;
  // loopfeel: lichte sin-mod op snelheid bij lopen
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

  state.shootCooldown=Math.max(0,state.shootCooldown-dt);
  state.reloadTime=Math.max(0,state.reloadTime-dt);

  // Auto-fire only while FIRE held
  if (state.fireHeld && state.reloadTime===0 && state.shootCooldown===0){
    tryShoot(state, setHud);
  }

  for(const e of state.enemies){
    if(!e.alive) continue; e.cool=Math.max(0,e.cool-dt);
    e.t += dt; e.rot += e.rotSpd*dt;
    const dx=p.x-e.x, dy=p.y-e.y; const d=Math.hypot(dx,dy);
    if(d>0.6){
      const s=e.speed*dt; const ex=e.x+(dx/d)*s, ey=e.y+(dy/d)*s;
      if(!collide(ex,ey,e.rad)) { e.x=ex; e.y=ey; }
      else { trySlide(e, ex, ey, e.rad); }
    } else if(Math.random()<0.5*dt){
      setHud(h=>({...h, hp:Math.max(0,h.hp-1), msg:'Kubus-boop'}));
      state.hitFlash = Math.min(1, (state.hitFlash||0) + 0.3);
      state.shake = Math.min(1, (state.shake||0) + 0.15);
      state.lastDamageTime = performance.now();
    }
    if(d>1.2 && d<10 && e.cool===0){
      if(visible(e.x,e.y,p.x,p.y,STEP)){
        const ang=Math.atan2(dy,dx);
        const originX = e.x;
        const originY = e.y;
        spawnProjectile(state, originX, originY, ang, 14.0, 0.8, 'enemy', 'laser', 0.50, 0);
        e.cool = 0.7 + Math.random()*1.0;
      }
    }
  }
  resolveEnemyOverlaps(state.enemies);

  for(const pr of state.projectiles){
    if(pr.dead) continue;
    pr.ttl-=dt; if(pr.ttl<=0){ pr.dead=true; continue; }

    if(pr.type==='tracer'){
      // nothing to simulate, short-lived line
      continue;
    }

    const nxp = pr.x + pr.dx*pr.spd*dt;
    const nyp = pr.y + pr.dy*pr.spd*dt;
    pr.vz = (pr.vz ?? 0) + (-9.8)*dt;
    const nz  = (pr.z ?? 0) + (pr.vz ?? 0)*dt;
    if (pr.type==='bullet'){
      pr.age = (pr.age||0) + dt;
      if (pr.from==='player'){
        pr.travel = (pr.travel||0) + Math.hypot(nxp-pr.x, nyp-pr.y);
      }
    }

    if(isWall(nxp,nyp)){
      pr.dead=true; continue;
    }
    if(pr.type==='laser'){
      pr.trail = pr.trail || [];
      pr.trail.push({x:pr.x, y:pr.y});
      if(pr.trail.length>10) pr.trail.shift();
    } else if (pr.type==='bullet'){
      // small smoke trail for visibility
      pr.trail = pr.trail || [];
      pr.trail.push({x:pr.x, y:pr.y, a:0.15});
      if(pr.trail.length>6) pr.trail.shift();
    }
    pr.x=nxp; pr.y=nyp; pr.z = nz;

    const zOk = (pr.z ?? 0) <= 0.6;

    if(pr.from==='player'){
      for(const e of state.enemies){
        if(!e.alive) continue;
        const dd=Math.hypot(e.x-pr.x,e.y-pr.y);
        if(dd< (e.rad||0.28) && zOk){
          e.hp-=60; pr.dead=true;
          if(e.hp<=0){
            e.alive=false;
            setHud(h=>({...h, score:h.score+120, msg:'Cube down'}));
            const heightAtExplosion = Math.max(0, (e.zBase ?? 0.14) + (e.bobAmp ?? 0.012) * Math.sin((e.t ?? 0)*2));
            spawnExplosion(state, e.x, e.y, e.color, heightAtExplosion);
            state.lastExplosionAt = {x:e.x, y:e.y};
          }
          break;
        }
      }
    } else {
      const dd=Math.hypot(p.x-pr.x,p.y-pr.y);
      if(dd<0.35 && zOk){ pr.dead=true; setHud(h=>({...h, hp:Math.max(0,h.hp-12), msg:'Laser hit!'})); state.hitFlash = Math.min(1, (state.hitFlash||0) + 0.6); state.shake = Math.min(1, (state.shake||0) + 0.25); state.lastDamageTime = performance.now(); }
    }
  }
  state.projectiles = state.projectiles.filter(pr=>!pr.dead);

  for(const part of state.particles){
    if(part.dead) continue;
    integrateParticle(part, dt);
  }
  state.particles = state.particles.filter(p=>!p.dead);

  const gx=Math.floor(p.x), gy=Math.floor(p.y);
  if(baseMap[idx(gx,gy)]===2){ state.won=true; setHud(h=>({...h, msg:'Level complete!'})); }
}

export function initState(){
  return {
    player: { x:2.5, y:2.5, dir:0, pitch:0, fov: Math.PI/3, speed:2.6 },
    enemies: spawnEnemies(9),
    projectiles: [],
    particles: [],
    last: performance.now(),
    keys:{},
    moveVec:{x:0,y:0},
    turnStickX:0,
    turnStickY:0,
    shootCooldown:0,
    reloadTime:0,
    won:false,
    fireHeld:false,
    hitFlash:0,
    shake:0,
    lastDamageTime:0,
  };
}