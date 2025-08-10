import React, { useEffect, useRef, useState } from "react";

/**
 * Mobile Doom-Lite – Canvas Build V2.9 (industry-refactor)
 *
 * - Vite + React + Tailwind setup
 * - Self-tests only in dev builds
 */

/* ================= Config ================= */
const CONTROL_DIAMETER = 110;
const LOOK_RADIUS      = 90;
const DEADZONE         = 0.10;

const MAP_W = 16, MAP_H = 16;
const FOV = Math.PI/3;
const MAX_DEPTH = 20;
const STEP = 0.02;
const PITCH_LIMIT = Math.PI * 80 / 180; // ±80° = 160° verticale rotatie

/* 1=wall, 0=floor, 2=exit */
const baseMap = [
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,1,0,0,0,1,1,1,0,1,0,1,
  1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,1,
  1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,1,
  1,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,
  1,0,0,1,0,1,0,0,0,1,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,
  1,0,0,1,0,1,0,0,0,1,0,1,0,1,0,1,
  1,0,0,1,0,1,0,0,0,1,0,1,0,1,0,1,
  1,0,0,1,0,0,0,0,0,1,0,1,0,1,0,1,
  1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
];

/* ================= Utils ================= */
function idx(x,y){ return y*MAP_W + x; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function tileAt(px,py){ const gx=Math.floor(px), gy=Math.floor(py); if(gx<0||gy<0||gx>=MAP_W||gy>=MAP_H) return 1; return baseMap[idx(gx,gy)]; }
function isWall(px,py){ return tileAt(px,py)===1; }
function collide(px,py, radius=0.18){
  const steps=10; for(let i=0;i<steps;i++){ const a=i/steps*Math.PI*2; const sx=px+Math.cos(a)*radius, sy=py+Math.sin(a)*radius; if(isWall(sx,sy)) return true; } return false;
}
/* React #130 guard */
function coerceLabel(label, fallback){
  if (label == null) return fallback;
  if (typeof label === 'string' || typeof label === 'number') return label;
  if (React.isValidElement(label)) return label;
  return fallback;
}

/* ================= Component ================= */
export default function DoomLiteCanvas(){
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [running,setRunning] = useState(true);
  const [hud,setHud] = useState({ hp:100, ammo:6, score:0, msg:"" });
  const [fps,setFps] = useState(0);
  const gameRef = useRef(null);

  useEffect(()=>{
    const state = {
      player: { x:2.5, y:2.5, dir:0, pitch:0, fov:FOV, speed:2.6 },
      enemies: spawnEnemies(9),
      projectiles: [],  // {x,y,dx,dy,spd,ttl,from,type,trail:[]}
      particles: [],    // explosion particles
      last: performance.now(),
      keys:{},
      moveVec:{x:0,y:0},
      turnStickX:0, // -1..1
      turnStickY:0, // -1..1
      shootCooldown:0,
      reloadTime:0,
      won:false,
    };
    gameRef.current = state;

    // keyboard
    const kd=e=>{ state.keys[e.code]=true; if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS","Space","KeyR"].includes(e.code)) e.preventDefault(); };
    const ku=e=>{ state.keys[e.code]=false; };
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);

    // canvas setup
    const cv=canvasRef.current; const ctx=cv.getContext('2d');
    function resize(){
      const w = Math.max(window.innerWidth, document.documentElement.clientWidth || 0);
      const h = Math.max(window.innerHeight, document.documentElement.clientHeight || 0);
      const ratio=window.devicePixelRatio||1;
      cv.width=Math.floor(w*ratio); cv.height=Math.floor(h*ratio);
      cv.style.width=w+'px'; cv.style.height=h+'px';
      ctx.imageSmoothingEnabled=false;
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    // loop
    let frames=0, t0=performance.now();
    function loop(){
      const st=gameRef.current; if(!st) return;
      const now=performance.now(); const dt=Math.min(0.033,(now-st.last)/1000); st.last=now;
      if(running){ update(st,dt,setHud); render(st,ctx,cv,false); } else { render(st,ctx,cv,true); }
      frames++; if(now-t0>500){ setFps(Math.round(frames*1000/(now-t0))); frames=0; t0=now; }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // touch controls (no tap/double-tap—buttons only)
    const detach = attachTouchControls(overlayRef.current, state);

    return ()=>{
      window.removeEventListener('keydown',kd);
      window.removeEventListener('keyup',ku);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      detach();
      gameRef.current=null;
    };
  }, [running]);

  useEffect(()=>{
    const onKey=(e)=>{ const st=gameRef.current; if(!st) return;
      if(e.code==='Space'){ e.preventDefault(); tryShoot(st,setHud); }
      if(e.code==='KeyR'){ e.preventDefault(); reload(st,setHud); }
      if(e.code==='ArrowUp'){ st.player.pitch = clamp(st.player.pitch + 0.02, -PITCH_LIMIT, PITCH_LIMIT); }
      if(e.code==='ArrowDown'){ st.player.pitch = clamp(st.player.pitch - 0.02, -PITCH_LIMIT, PITCH_LIMIT); }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  }, []);

  // 20px boven look-pad
  const buttonsBottom = 4 + CONTROL_DIAMETER + 20;

  return (
    <>
      <div className="fixed inset-0 bg-black">
        <canvas ref={canvasRef} className="block w-screen h-screen"/>
        <div ref={overlayRef} className="absolute inset-0 select-none">

          {/* HUD */}
          <div className="absolute top-3 left-16 right-3 flex items-center justify-between text-white text-sm md:text-base z-20">
            <div className="flex gap-3 bg-black/60 rounded-full px-4 py-2">
              <span>HP: {hud.hp}</span>
              <span>Ammo: {hud.ammo}</span>
              <span>Score: {hud.score}</span>
            </div>
            <div className="bg-black/60 rounded-full px-4 py-2">{fps} FPS</div>
          </div>
          {hud.msg && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm z-20">
              {hud.msg}
            </div>
          )}

          {/* FIRE/RELOAD – z-20 zodat ze boven touch-zones liggen */}
          <div className="absolute right-4 z-20" style={{ bottom: `${buttonsBottom}px` }}>
            <div className="flex gap-3">
              <CircleButton label="FIRE" onClick={()=>tryShoot(gameRef.current,setHud)} size={64} strong/>
              <CircleButton label="RELOAD" onClick={()=>reload(gameRef.current,setHud)} size={64}/>
            </div>
          </div>

          {/* Pause (rond) */}
          <div className="absolute top-3 left-3 z-30">
            <CircleButton label={running? 'II' : '▶'} onClick={()=>setRunning(r=>!r)} size={56}/>
          </div>

          {/* Ghost pads (alleen visueel) */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-10">
            <RoundGhost diameter={CONTROL_DIAMETER} label={coerceLabel('MOVE','MOVE')}/>
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 z-10">
            <RoundGhost diameter={CONTROL_DIAMETER} label={coerceLabel('LOOK','LOOK')}/>
          </div>

          {/* Ronde minimap */}
          <RoundMiniMap gameRef={gameRef} size={96}/>

          {/* Crosshair 40px */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <Crosshair40 />
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= Game logic ================= */
function spawnEnemies(n){
  const arr=[]; let tries=0;
  while(arr.length<n && tries<2000){
    tries++;
    const x=2+Math.random()*(MAP_W-4), y=2+Math.random()*(MAP_H-4);
    if(tileAt(x,y)!==0) continue;
    const baseG = 180 + Math.floor(Math.random()*60); // 180..239 (licht)
    arr.push({
      x,y,
      hp:60, alive:true,
      cool: 0.5 + Math.random()*0.8,
      speed: 0.7 + Math.random()*0.9,
      zBase: (Math.random()*0.30 - 0.05), // dichter bij de grond (-0.05..+0.25)
      bobAmp: 0.12 + Math.random()*0.16, // subtielere bobbing (0.12..0.28)
      t: Math.random()*10,
      rot: Math.random()*Math.PI*2,
      rotSpd: (Math.random()*1.5 + 0.5) * (Math.random()<0.5?-1:1),
      sizeMul: 0.32 + Math.random()*0.12,
      color: `rgb(${baseG},${baseG},${baseG})`,
      rad: 0.28, // collision radius voor enemy–enemy en enemy–wall
    });
  }
  return arr;
}

function trySlide(entity, nx, ny, radius=0.18){
  if(!collide(nx, entity.y, radius)) { entity.x = nx; return true; }
  if(!collide(entity.x, ny, radius)) { entity.y = ny; return true; }
  return false;
}

function resolveEnemyOverlaps(enemies){
  // Simpele pairwise separate: duw elkaar uit elkaar als de cirkels overlappen
  for(let i=0;i<enemies.length;i++){
    const a=enemies[i]; if(!a.alive) continue;
    for(let j=i+1;j<enemies.length;j++){
      const b=enemies[j]; if(!b.alive) continue;
      const dx=b.x-a.x, dy=b.y-a.y; const d2=dx*dx+dy*dy; const minDist=(a.rad||0.28)+(b.rad||0.28);
      if(d2>0 && d2 < minDist*minDist){
        const d=Math.sqrt(d2)||0.0001; const ux=dx/d, uy=dy/d; const overlap=minDist-d;
        // verplaats elk de helft, check geen muur
        const ax=a.x - ux*overlap*0.5, ay=a.y - uy*overlap*0.5;
        const bx=b.x + ux*overlap*0.5, by=b.y + uy*overlap*0.5;
        if(!collide(ax,ay,a.rad)) { a.x=ax; a.y=ay; }
        if(!collide(bx,by,b.rad)) { b.x=bx; b.y=by; }
      }
    }
  }
}

function update(state, dt, setHud){
  const p=state.player;
  const f={x:Math.cos(p.dir), y:Math.sin(p.dir)};
  const r={x:Math.cos(p.dir+Math.PI/2), y:Math.sin(p.dir+Math.PI/2)};

  // movement
  let mx=0,my=0;
  if(state.keys['KeyW']){mx+=f.x; my+=f.y;}
  if(state.keys['KeyS']){mx-=f.x; my-=f.y;}
  if(state.keys['KeyA']){mx-=r.x; my-=r.y;}
  if(state.keys['KeyD']){mx+=r.x; my+=r.y;}
  mx+=state.moveVec.x; my+=state.moveVec.y;
  const len=Math.hypot(mx,my)||1; mx/=len; my/=len;
  const step=2.6*dt;
  let nx=p.x+mx*step, ny=p.y+my*step;
  if(!collide(nx,p.y)) p.x=nx; else trySlide(p, nx, p.y);
  if(!collide(p.x,ny)) p.y=ny; else trySlide(p, p.x, ny);

  // look
  if(state.keys['ArrowLeft']) p.dir -= 1.8*dt;
  if(state.keys['ArrowRight']) p.dir += 1.8*dt;
  const sensX = 3.6, sensY = 1.8;
  p.dir   += state.turnStickX * sensX * dt;
  p.pitch += state.turnStickY * sensY * dt;
  p.pitch = clamp(p.pitch, -PITCH_LIMIT, PITCH_LIMIT);
  // optioneel: rem pitch langzaam naar 0 als geen input (voelt stabieler)
  if (Math.abs(state.turnStickY) < 0.001 && !state.keys['ArrowUp'] && !state.keys['ArrowDown']) {
    p.pitch *= (1 - Math.min(1, 1.5*dt));
  }

  state.shootCooldown=Math.max(0,state.shootCooldown-dt);
  state.reloadTime=Math.max(0,state.reloadTime-dt);

  // enemies
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
    }
    // lasers uit kubuscentrum
    if(d>1.2 && d<10 && e.cool===0){
      if(visible(e.x,e.y,p.x,p.y)){
        const ang=Math.atan2(dy,dx);
        spawnProjectile(state, e.x, e.y, ang, 14.0, 0.8, 'enemy', 'laser', 0.45, 0);
        e.cool = 0.7 + Math.random()*1.0;
      }
    }
  }
  // Niet door elkaar bewegen
  resolveEnemyOverlaps(state.enemies);

  // projectiles (with trail)
  for(const pr of state.projectiles){
    if(pr.dead) continue;
    pr.ttl-=dt; if(pr.ttl<=0){ pr.dead=true; continue; }
    // 3D beweging: horizontaal + verticale component
    const nxp = pr.x + pr.dx*pr.spd*dt;
    const nyp = pr.y + pr.dy*pr.spd*dt;
    pr.vz = (pr.vz ?? 0) + (-9.8)*dt; // zwaartekracht
    const nz  = (pr.z ?? 0) + (pr.vz ?? 0)*dt;

    if(isWall(nxp,nyp)){
      pr.dead=true; continue;
    }
    if(pr.type==='laser'){
      pr.trail = pr.trail || [];
      pr.trail.push({x:pr.x, y:pr.y});
      if(pr.trail.length>10) pr.trail.shift();
    }
    pr.x=nxp; pr.y=nyp; pr.z = nz;

    // Player hit alleen als kogel laag genoeg is (bijna op grondniveau)
    const zOk = (pr.z ?? 0) <= 0.6; // tolerance

    if(pr.from==='player'){
      for(const e of state.enemies){
        if(!e.alive) continue;
        const dd=Math.hypot(e.x-pr.x,e.y-pr.y);
        if(dd< (e.rad||0.28) && zOk){
          e.hp-=60; pr.dead=true;
          if(e.hp<=0){
            e.alive=false;
            setHud(h=>({...h, score:h.score+120, msg:'Cube down'}));
            spawnExplosion(state, e.x, e.y, e.color);
          }
          break;
        }
      }
    } else {
      const dd=Math.hypot(p.x-pr.x,p.y-pr.y);
      if(dd<0.35 && zOk){ pr.dead=true; setHud(h=>({...h, hp:Math.max(0,h.hp-12), msg:'Laser hit!'})); }
    }
  }
  state.projectiles = state.projectiles.filter(pr=>!pr.dead);

  // particles update (met verticale val)
  for(const part of state.particles){
    if(part.dead) continue;
    part.ttl -= dt; if(part.ttl<=0){ part.dead=true; continue; }
    // verticale hoogte (h) en snelheid (vh) – zwaartekracht omlaag
    part.vh += -9.8*dt; // sterkere zwaartekracht (minder zweverig)
    part.h  += part.vh*dt;
    if(part.h < 0){
      part.h = 0;
      part.vh *= -0.35; // iets stevigere stuiter
      // grondwrijving bij contact met vloer
      part.vx *= 0.82;
      part.vy *= 0.82;
      // kleine random spreiding om stilvallen natuurlijk te maken
      if (Math.abs(part.vh) < 0.2) part.vh = 0;
      if (Math.hypot(part.vx, part.vy) < 0.05) { part.vx = 0; part.vy = 0; }
    }

    // horizontale beweging (vlak)
    part.x += part.vx*dt;
    part.y += part.vy*dt;

    if(isWall(part.x, part.y)){
      part.vx *= -0.25; part.vy *= -0.25;
    }
  }
  state.particles = state.particles.filter(p=>!p.dead);

  // win
  const gx=Math.floor(p.x), gy=Math.floor(p.y);
  if(baseMap[idx(gx,gy)]===2){ state.won=true; setHud(h=>({...h, msg:'Level complete!'})); }
}

function spawnExplosion(state, x, y, color){
  const n = 24 + Math.floor(Math.random()*16);
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 2.0 + Math.random()*3.5; // horizontale snelheid iets lager voor realisme
    const h0 = 0.30 + Math.random()*0.35; // start-hoogte dichter bij de grond
    const vh0 = 1.2 + Math.random()*1.3; // minder initiele verticale snelheid
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

function render(state, ctx, cv, paused=false){
  const W=cv.width, H=cv.height; const p=state.player;
  const horizon = H/2 + Math.tan(p.pitch)*H*0.25;
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);

  const cols=Math.floor(W/2); const colW=W/cols; const depths = new Array(cols);

  // walls + depth
  for(let i=0;i<cols;i++){
    const camX=(i/cols-0.5)*p.fov; const ray=p.dir+camX;
    let dist=0, hit=0; let x=p.x, y=p.y; const sx=Math.cos(ray)*STEP, sy=Math.sin(ray)*STEP;
    for(dist=0; dist<MAX_DEPTH; dist+=STEP){ x+=sx; y+=sy; const t=tileAt(x,y); if(t===1||t===2){ hit=t; break; } }
    const corrected=dist*Math.cos(camX); depths[i] = corrected;
    const wallH=Math.min(H, (H/(corrected+0.0001))*0.9);
    const shade=clamp(1 - corrected/10, 0, 1);
    const g=Math.floor(200*shade);
    let color = `rgb(${g},${g},${g})`;
    if(hit===2){ const gg=Math.floor(220*shade); color = `rgb(${gg},${gg},${gg})`; }
    const x0=Math.floor(i*colW);
    ctx.fillStyle=color; ctx.fillRect(x0, horizon-wallH/2, Math.ceil(colW)+1, wallH);
  }

  // billboards (enemies, projectiles, particles)
  const bills=[];
  for(const e of state.enemies){ if(!e.alive) continue; const b=projectBillboard(p,W,e.x,e.y); if(b){ b.kind='enemy'; b.hp=e.hp; b.extra=e; bills.push(b); } }
  for(const pr of state.projectiles){ const b=projectBillboard(p,W,pr.x,pr.y); if(b){ b.kind=pr.type||'bullet'; b.extra=pr; bills.push(b); } if(pr.type==='laser' && pr.trail){ for(let t=0; t<pr.trail.length; t++){ const pt = pr.trail[t]; const tb = projectBillboard(p,W,pt.x,pt.y); if(tb){ tb.kind='laserTrail'; tb.extra={ alpha: (t+1)/pr.trail.length }; bills.push(tb); } } } }
  for(const part of state.particles){ const b=projectBillboard(p,W,part.x,part.y); if(b){ b.kind='particle'; b.extra=part; bills.push(b); } }
  bills.sort((a,b)=>b.z-a.z);

  // draw with occlusion samples
  for(const b of bills){
    const spriteW = Math.max(2, b.s*0.45);
    const leftPx = b.x - spriteW/2; const rightPx = b.x + spriteW/2;
    const colsCount = depths.length; const colW2 = W/colsCount;
    let visibleSprite = false; const samples = Math.max(5, Math.floor(spriteW/colW2));
    for(let s=0;s<samples;s++){
      const px = leftPx + (s/(samples-1))*(rightPx-leftPx);
      const col = clamp(Math.floor(px/colW2), 0, colsCount-1);
      const wallZCorr = depths[col] ?? MAX_DEPTH;
      const camX = ((col/colsCount) - 0.5) * p.fov;
      const cosCam = Math.max(0.0001, Math.cos(camX));
      const wallZUncorr = wallZCorr / cosCam;
      if (b.z < wallZUncorr - 0.02) { visibleSprite = true; break; }
    }
    if(!visibleSprite) continue;

    if(b.kind==='enemy'){
      const e=b.extra;
      const cubeSize = spriteW * (e.sizeMul||0.4);
      const x = b.x; const yCenter = horizon - (b.s*0.7) + ( (e.zBase + Math.sin(e.t)*e.bobAmp) * (H*0.08) );
      drawCube3D(ctx, x, yCenter, cubeSize, e.rot, e.color);
      // health bar
      ctx.fillStyle='#000'; ctx.fillRect(x - cubeSize/2, yCenter - cubeSize/2 - 8, cubeSize, 6);
      ctx.fillStyle='#fff'; ctx.fillRect(x - cubeSize/2, yCenter - cubeSize/2 - 8, cubeSize*(b.hp/100), 6);
    } else if (b.kind==='laser'){
      // Render als glowend punt met kleine trail
      const s = Math.max(3, spriteW*0.22);
      const x = b.x; const y = horizon - s*0.2;
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      // zachte gloed
      ctx.globalAlpha=0.35; ctx.beginPath(); ctx.arc(x, y, s*1.6, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();
      // kern
      ctx.globalAlpha=1; ctx.beginPath(); ctx.arc(x, y, Math.max(1, s*0.6), 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();
      ctx.restore();
    } else if (b.kind==='laserTrail'){
      // kleine zwakkere puntjes achter de laser
      const s = Math.max(2, spriteW*0.16);
      const x = b.x; const y = horizon - s*0.2;
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha = 0.08 + 0.22*(b.extra.alpha||0.5); ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill(); ctx.globalAlpha=1; ctx.restore();
    } else if (b.kind==='particle'){
      const part=b.extra;
      const s = Math.max(2, b.s * part.size * 0.6);
      const hPix = (H*0.12) * Math.max(0, part.h||0);
      const x = b.x - s/2;
      // ground-alignment: wanneer h ~ 0, plaats vlak op grondlijn
      const groundY = horizon - s*0.5;
      const y = (part.h <= 0.001) ? groundY : (horizon - s*0.3) - hPix;
      const lifeAlpha = clamp(part.ttl/1.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75*lifeAlpha;
      ctx.fillStyle = part.color;
      ctx.fillRect(x, y, s, s);
      ctx.restore();
    } else {
      // player bullet (wit) met hoogte-illusie: kleiner en iets hoger bij positieve z
      const pr = b.extra;
      const s = Math.max(2, b.s*0.18);
      const rise = clamp(((pr?.z)||0) * (H*0.06), 0, H*0.15);
      ctx.fillStyle='#fff';
      const x = b.x - s/2, y = (horizon - s*0.2) - rise;
      ctx.fillRect(x,y,s,s);
    }
  }

  if(paused){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font=`${Math.floor(W*0.05)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }
}

// 3D cube (lokale 3D rotatie + orthografische projectie) – SOLID zonder wireframe
function drawCube3D(ctx, cx, cy, size, t, color){
  const s=size/2; const verts=[
    [-s,-s,-s],[ s,-s,-s],[ s, s,-s],[-s, s,-s],
    [-s,-s, s],[ s,-s, s],[ s, s, s],[-s, s, s],
  ];
  const sy=Math.sin(t), cy_=Math.cos(t);
  const sp=Math.sin(t*0.6), cp=Math.cos(t*0.6);
  const sr=Math.sin(t*0.3), cr=Math.cos(t*0.3);
  function rot(v){
    let [x,y,z]=v;
    // yaw (Z)
    let x1 =  x*cy_ - y*sy; let y1 = x*sy + y*cy_; let z1 = z;
    // pitch (X)
    let y2 =  y1*cp - z1*sp; let z2 = y1*sp + z1*cp; let x2 = x1;
    // roll (Y)
    let z3 =  z2*cr - x2*sr; let x3 = z2*sr + x2*cr; let y3 = y2;
    return [x3,y3,z3];
  }
  const v = verts.map(rot).map(([x,y])=>[x+cx, y+cy]);
  const faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,3,7,4]];
  // parse kleur uit 'rgb(r,g,b)'
  let base=200;
  if(typeof color==='string' && color.startsWith('rgb(')){
    const inside = color.slice(4, -1); const parts = inside.split(','); const r = parseInt(parts[0],10); if(!Number.isNaN(r)) base = r;
  }
  const mul=[0.70,1.00,0.85,0.85,0.90,0.90];
  for(let i=0;i<faces.length;i++){
    const f=faces[i]; const g=Math.max(0,Math.min(255,Math.floor(base*mul[i])));
    ctx.beginPath(); ctx.moveTo(v[f[0]][0], v[f[0]][1]);
    for(let k=1;k<f.length;k++) ctx.lineTo(v[f[k]][0], v[f[k]][1]);
    ctx.closePath(); ctx.fillStyle=`rgb(${g},${g},${g})`; ctx.fill();
  }
}

function projectBillboard(p, screenW, x, y){
  const dx=x-p.x, dy=y-p.y; const dist=Math.hypot(dx,dy); if(dist<0.05) return null;
  const ang=Math.atan2(dy,dx)-p.dir;
  const a=((ang+Math.PI)%(2*Math.PI))-Math.PI;
  if(Math.abs(a)>p.fov) return null; // gebruik volledige FOV i.p.v. *0.7
  const s = Math.min(9999, (1/(dist+0.0001)) * (screenW*0.9));
  const screenX = (0.5 + (a/p.fov)) * screenW;
  return { z:dist, x:screenX, s };
}

function normalizeAngle(a){
  let x = ((a + Math.PI) % (2*Math.PI)); if (x < 0) x += 2*Math.PI; return x - Math.PI;
}
function lerpAngles(a, b, t){
  const d = normalizeAngle(b - a);
  return a + d * t;
}
function computeAimAssistDirection(state, baseDir){
  const p = state.player;
  const maxAimDeg = 8; // kleine aim assist (~8 graden)
  const maxAim = maxAimDeg * Math.PI / 180;
  const maxDist = 9.0;
  let best = null;
  for(const e of state.enemies){
    if(!e.alive) continue;
    const dx = e.x - p.x, dy = e.y - p.y; const dist = Math.hypot(dx,dy);
    if(dist > maxDist) continue;
    if(!visible(p.x,p.y,e.x,e.y)) continue;
    const ang = Math.atan2(dy,dx);
    const diff = Math.abs(normalizeAngle(ang - baseDir));
    if(diff > maxAim) continue;
    if(!best || diff < best.diff){ best = { ang, diff, dist }; }
  }
  if(!best) return baseDir;
  const closeness = 1 - best.diff / maxAim; // 0..1
  const distanceFactor = Math.max(0, Math.min(1, 1 - best.dist / maxDist));
  const strength = 0.6 * closeness * (0.5 + 0.5*distanceFactor); // max ~0.6
  return lerpAngles(baseDir, best.ang, strength);
}
function tryShoot(state, setHud){
  if(!state||state.won) return;
  if(state.reloadTime>0||state.shootCooldown>0) return;
  setHud(h=>{ if(h.ammo<=0) return {...h, msg:'Click! (Leeg)'}; return {...h, ammo:h.ammo-1, msg:'Bang!'}; });
  state.shootCooldown=0.15;
  const p=state.player;
  const aimDir = computeAimAssistDirection(state, p.dir);
  const bulletPitch = p.pitch; // gebruik huidige pitch voor verticale richting
  spawnProjectile(state, p.x, p.y, aimDir, 12.0, 1.2, 'player', 'bullet', 0.35, bulletPitch);
}
function spawnProjectile(state, x, y, dir, spd, ttl, from, type, z0 = (from==='player'?0.35:0.50), pitch = 0){
  const spread = 0; // altijd naar crosshair richten (geen random spread)
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const dx = Math.cos(dir+spread) * cosP;
  const dy = Math.sin(dir+spread) * cosP;
  const vz = sinP * spd;
  const pr = { x: x + Math.cos(dir)*0.2, y: y + Math.sin(dir)*0.2, dx, dy, spd, ttl, from, type, z: z0, vz };
  if(type==='laser'){ pr.trail=[]; }
  state.projectiles.push(pr);
}
function visible(x0,y0,x1,y1){
  const dx=x1-x0, dy=y1-y0; const dist=Math.hypot(dx,dy); const steps=Math.ceil(dist/STEP);
  for(let i=1;i<steps;i++){ const t=i/steps; const x=x0+dx*t, y=y0+dy*t; if(isWall(x,y)) return false; }
  return true;
}
function reload(state,setHud){
  if(!state) return;
  if(state.reloadTime>0) return;
  setHud(h=>({...h, msg:'Reloading…'}));
  state.reloadTime=0.9;
  setTimeout(()=>{ setHud(h=>({...h, ammo:6, msg:''})); state.reloadTime=0; }, 900);
}

/* ================= Touch controls =================
   Left = move (relative drag)
   Right = look (virtuele joystick X/Y) – geen tap/double-tap acties
*/
function attachTouchControls(root, state){
  if(!root) return ()=>{};

  const left=document.createElement('div');
  Object.assign(left.style,{position:'absolute',left:'0',bottom:'0',width:'50%',height:'55%',touchAction:'none',background:'transparent',zIndex:5});

  const right=document.createElement('div');
  Object.assign(right.style,{position:'absolute',right:'0',bottom:'0',width:'50%',height:'55%',touchAction:'none',background:'transparent',zIndex:5});

  root.appendChild(left); root.appendChild(right);

  // LEFT: MOVE
  let startL=null;
  function onStartL(e){ const t=e.changedTouches[0]; startL={x:t.clientX,y:t.clientY}; e.preventDefault(); }
  function onMoveL(e){
    if(!startL) return;
    const t=e.changedTouches[0];
    const dx=t.clientX-startL.x, dy=t.clientY-startL.y;
    const max=80;
    const nx=clamp(dx/max,-1,1), ny=clamp(dy/max,-1,1);
    const p=state.player;
    const f={x:Math.cos(p.dir), y:Math.sin(p.dir)}, r={x:Math.cos(p.dir+Math.PI/2), y:Math.sin(p.dir+Math.PI/2)};
    state.moveVec.x = f.x*(-ny) + r.x*nx;
    state.moveVec.y = f.y*(-ny) + r.y*nx;
    e.preventDefault();
  }
  function onEndL(e){ startL=null; state.moveVec.x=0; state.moveVec.y=0; e.preventDefault(); }
  left.addEventListener('touchstart',onStartL,{passive:false});
  left.addEventListener('touchmove',onMoveL,{passive:false});
  left.addEventListener('touchend',onEndL,{passive:false});
  left.addEventListener('touchcancel',onEndL,{passive:false});

  // RIGHT: LOOK (virtuele stick)
  let R = {active:false, ox:0, oy:0};
  function onStartR(e){ const t=e.changedTouches[0]; R.active=true; R.ox=t.clientX; R.oy=t.clientY; e.preventDefault(); }
  function onMoveR(e){
    if(!R.active) return;
    const t=e.changedTouches[0];
    const dx = t.clientX - R.ox;
    const dy = t.clientY - R.oy;
    let nx = clamp(dx/LOOK_RADIUS, -1, 1);
    let ny = clamp(dy/LOOK_RADIUS, -1, 1);
    if (Math.abs(nx) < DEADZONE) nx = 0; else nx = (nx - Math.sign(nx)*DEADZONE) / (1 - DEADZONE);
    if (Math.abs(ny) < DEADZONE) ny = 0; else ny = (ny - Math.sign(ny)*DEADZONE) / (1 - DEADZONE);
    state.turnStickX = nx;
    state.turnStickY = -ny; // omhoog swipen = omhoog kijken
    e.preventDefault();
  }
  function onEndR(e){ if(!R.active){ e.preventDefault(); return; } state.turnStickX = 0; state.turnStickY = 0; R.active=false; e.preventDefault(); }
  right.addEventListener('touchstart',onStartR,{passive:false});
  right.addEventListener('touchmove',onMoveR,{passive:false});
  right.addEventListener('touchend',onEndR,{passive:false});
  right.addEventListener('touchcancel',onEndR,{passive:false});

  return ()=>{ try{ root.removeChild(left); root.removeChild(right);}catch{} };
}

/* ================= UI bits ================= */
function CircleButton({ label, onClick, size=64, strong=false }){
  const safe = coerceLabel(label, '');
  return (
    <button
      onClick={onClick}
      style={{ width:size, height:size }}
      className={`rounded-full text-white border ${strong? 'bg-white/25 border-white/40' : 'bg-white/12 border-white/25'} active:scale-95 flex items-center justify-center text-xs font-semibold`}
    >{safe}</button>
  );
}
function RoundGhost({ diameter=CONTROL_DIAMETER, label }){
  const safe = coerceLabel(label, '');
  return (
    <div style={{ width: diameter, height: diameter }} className="rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-[10px] text-white/60 select-none">{safe}</div>
  );
}
function RoundMiniMap({ gameRef, size=96 }){
  const ref=useRef(null);
  useEffect(()=>{ let raf;
    function draw(){
      const cv=ref.current; if(!cv){ raf=requestAnimationFrame(draw); return; }
      const ctx=cv.getContext('2d'); const st=gameRef.current; if(!st){ raf=requestAnimationFrame(draw); return; }
      const W=size, H=size; cv.width=W; cv.height=H; ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,W,H);
      const scale=W/(MAP_W);
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
      for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++){
        const t=baseMap[idx(x,y)];
        if(t){ ctx.fillStyle = (t===2? 'rgba(200,255,200,0.8)' : 'rgba(255,255,255,0.15)'); ctx.fillRect(x*scale,y*scale,scale,scale); }
      }
      // enemies
      ctx.fillStyle='rgba(255,255,255,0.9)';
      for(const e of st.enemies){ if(!e.alive) continue; ctx.beginPath(); ctx.arc(e.x*scale, e.y*scale, 1.6, 0, Math.PI*2); ctx.fill(); }
      // projectiles
      ctx.fillStyle='rgba(255,255,255,0.9)';
      for(const pr of st.projectiles){ ctx.beginPath(); ctx.arc(pr.x*scale, pr.y*scale, 1.1, 0, Math.PI*2); ctx.fill(); }
      // player
      const p=st.player; ctx.fillStyle='rgba(0,200,255,1)'; ctx.beginPath(); ctx.arc(p.x*scale, p.y*scale, 2.2, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(0,200,255,1)'; ctx.beginPath(); ctx.moveTo(p.x*scale, p.y*scale); ctx.lineTo((p.x+Math.cos(p.dir)*0.8)*scale, (p.y+Math.sin(p.dir)*0.8)*scale); ctx.stroke();
      raf=requestAnimationFrame(draw);
    }
    raf=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(raf);
  }, [gameRef, size]);

  return (
    <div className="absolute top-3 right-3 p-1 rounded-full bg-black/40 border border-white/15 overflow-hidden z-20" style={{ width:size+8, height:size+8 }}>
      <canvas ref={ref} style={{ width: size, height: size }} />
    </div>
  );
}
function Crosshair40(){
  // Vast 40x40 px plusje, exact gecentreerd
  return (
    <svg width={40} height={40} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" viewBox="0 0 40 40">
      <line x1="8" y1="20" x2="32" y2="20" stroke="white" strokeOpacity="0.9" strokeWidth="1.5" />
      <line x1="20" y1="8" x2="20" y2="32" stroke="white" strokeOpacity="0.9" strokeWidth="1.5" />
    </svg>
  );
}

/* ================= Self-tests (dev only) ================= */
if (import.meta && import.meta.env && import.meta.env.DEV) {
  (function runSelfTests(){
    console.assert(clamp(2,0,1)===1, 'clamp high bound failed');
    console.assert(clamp(-1,0,1)===0, 'clamp low bound failed');
    console.assert(clamp(0.5,0,1)===0.5, 'clamp mid failed');
    console.assert(coerceLabel(undefined,'X')==='X', 'coerceLabel fallback failed');
    console.assert(typeof coerceLabel('ok','X')==='string', 'coerceLabel string failed');
    console.assert(React.isValidElement(coerceLabel(React.createElement('span',null,'ok'),'X')), 'coerceLabel element failed');

    const p={x:0,y:0,dir:0,fov:FOV,pitch:0};
    const inFront = projectBillboard(p, 800, 2, 0); // in front
    const offFov  = projectBillboard(p, 800, -2, 0); // behind (off FOV)
    console.assert(inFront && inFront.z>0, 'projectBillboard in-front failed');
    console.assert(offFov===null, 'projectBillboard off-FOV failed');

    const deg = PITCH_LIMIT*180/Math.PI;
    console.assert(Math.abs(deg-80)<0.05, 'Pitch limit not ~80°');

    // New: spawnExplosion sanity
    const tmp={ particles: [] };
    spawnExplosion(tmp, 5, 5, 'rgb(200,200,200)');
    console.assert(tmp.particles.length>=24 && tmp.particles.length<=40, 'spawnExplosion count out of range');
    console.assert(tmp.particles.every(pt=> 'h' in pt && 'vh' in pt), 'explosion particles missing h/vh');

    // Touch controls detach no-op when root is null
    const det = attachTouchControls(null, {});
    console.assert(typeof det === 'function', 'attachTouchControls should return a function');
  })();
}