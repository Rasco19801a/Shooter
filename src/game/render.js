import { MAX_DEPTH, STEP } from './constants.js';
import { clamp, tileAt } from './utils.js';
import { projectBillboard } from './visibility.js';
import { drawCube3D, drawRectPrism3D } from './draw.js';

export function render(state, ctx, cv, paused=false){
  const W=cv.width, H=cv.height; const p=state.player;
  const bob = Math.sin(state.last*0.016*(Math.hypot(state.moveVec.x,state.moveVec.y)>0.001?1:0)) * (H*0.004);
  const horizon = H/2 + Math.tan(p.pitch)*H*0.25 + bob;

  // camera shake (decays each frame)
  const shake = clamp((state.shake||0), 0, 1);
  if(shake>0){ state.shake = Math.max(0, state.shake - 0.025); }
  const shakeX = (Math.random()*2-1) * shake * (W*0.0025);
  const shakeY = (Math.random()*2-1) * shake * (H*0.0025);

  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);

  const cols=Math.floor(W/2); const colW=W/cols; const depths = new Array(cols);

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
    const x0=Math.floor(i*colW + shakeX);
    ctx.fillStyle=color; ctx.fillRect(x0, horizon - wallH/2 + shakeY, Math.ceil(colW)+1, wallH);
  }

  const bills=[]; const tracerLines=[];
  for(const e of state.enemies){ if(!e.alive) continue; const b=projectBillboard(p,W,e.x,e.y); if(b){ b.kind='enemy'; b.hp=e.hp; b.extra=e; bills.push(b); } }
  for(const pr of state.projectiles){ if(pr.type==='tracer'){ tracerLines.push(pr); continue; } const b=projectBillboard(p,W,pr.x,pr.y); if(b){ b.kind=pr.type||'bullet'; b.extra=pr; bills.push(b); } if(pr.type==='laser' && pr.trail){ for(let t=0; t<pr.trail.length; t++){ const pt = pr.trail[t]; const tb = projectBillboard(p,W,pt.x,pt.y); if(tb){ tb.kind='laserTrail'; tb.extra={ alpha: (t+1)/pr.trail.length }; bills.push(tb); } } } }
  for(const part of state.particles){ const b=projectBillboard(p,W,part.x,part.y); if(b){ b.kind='particle'; b.extra=part; bills.push(b); } }
  bills.sort((a,b)=>b.z-a.z);

  // draw hitscan tracers first (additive)
  if(tracerLines.length){
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1, W*0.002);
    for(const t of tracerLines){
      const a = projectBillboard(p,W,t.sx,t.sy); const b = projectBillboard(p,W,t.ex,t.ey);
      if(a && b){ ctx.beginPath(); ctx.moveTo(a.x + shakeX, horizon + shakeY); ctx.lineTo(b.x + shakeX, horizon + shakeY); ctx.stroke(); }
    }
    ctx.restore();
  }

  // draw a simple 3D muzzle at bottom-left that aims to crosshair
  (function drawMuzzle(){
    const muzzleW = Math.max(24, W*0.12);
    const muzzleH = Math.max(24, H*0.12);
    const muzzleD = Math.max(48, W*0.32); // longer than wide, doubled
    const cx = W/2; // center bottom
    const cy = H + Math.max(10, H*0.02); // extend slightly off-screen
    const yaw = (state.turnStickX||0) * 0.6;
    const pitch = -(p.pitch||0) * 0.8 + (state.turnStickY||0) * 0.3;
    const roll = (state.isMoving ? Math.sin(state.last*0.01)*0.08 : 0);
    const tip = drawRectPrism3D(ctx, cx + shakeX, cy + shakeY, muzzleW, muzzleH, muzzleD, yaw, pitch, roll, 'rgb(200,200,200)');
    state.muzzleScreen = tip; // expose for bullet flash alignment
  })();

  for(const b of bills){
    const spriteW = Math.max(2, b.s*0.45);
    const leftPx = b.x - spriteW/2; const rightPx = b.x + spriteW/2;
    const colsCount = depths.length; const colW2 = W/colsCount;
    let visibleSprite = false; const samples = Math.max(5, Math.floor(spriteW/colW2));
    for(let s=0;s<samples;s++){
      const px = leftPx + (s/(samples-1))*(rightPx-leftPx);
      const col = Math.max(0, Math.min(colsCount-1, Math.floor(px/colW2)));
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
      const x = b.x + shakeX;
      const baseFromBottom = 50;
      const eHeight = Math.max(0, (e.zBase ?? 0.14) + (e.bobAmp ?? 0.012) * Math.sin((e.t ?? 0)*2));
      const risePx  = Math.max(0, Math.min(H*0.45, eHeight * (H*0.12)));
      const yCenter = (H - baseFromBottom) - cubeSize/2 - risePx + shakeY;
      drawCube3D(ctx, x, yCenter, cubeSize, e.rot, e.color);
      ctx.fillStyle='#000'; ctx.fillRect(x - cubeSize/2, yCenter - cubeSize/2 - 8, cubeSize, 6);
      ctx.fillStyle='#fff'; ctx.fillRect(x - cubeSize/2, yCenter - cubeSize/2 - 8, cubeSize*(b.hp/100), 6);
    } else if (b.kind==='laser'){
      const pr = b.extra;
      const s = Math.max(3, spriteW*0.22);
      const rise = Math.max(0, Math.min(H*0.35, ((pr?.z)||0) * (H*0.12)));
      const x = b.x + shakeX; const y = (horizon - s*0.2) - rise + shakeY;
      ctx.save(); ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=0.35; ctx.beginPath(); ctx.arc(x, y, s*1.6, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();
      ctx.globalAlpha=1; ctx.beginPath(); ctx.arc(x, y, Math.max(1, s*0.6), 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();
      ctx.restore();
    } else if (b.kind==='laserTrail'){
      const s = Math.max(2, spriteW*0.16);
      const x = b.x + shakeX; const y = horizon - s*0.2 + shakeY;
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha = 0.08 + 0.22*(b.extra.alpha||0.5); ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill(); ctx.globalAlpha=1; ctx.restore();
    } else if (b.kind==='particle'){
      const part=b.extra;
      const s = Math.max(2, b.s * part.size * 0.6);
      const groundY = H - s - 2;
      const hPix = (H*0.12) * Math.max(0, part.h||0);
      const x = (b.x + shakeX) - s/2;
      const y = (part.h <= 0.001) ? groundY : (groundY - hPix);
      const lifeAlpha = clamp(part.ttl/1.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75*lifeAlpha;
      ctx.fillStyle = part.color;
      ctx.fillRect(x, y + shakeY, s, s);
      ctx.restore();
    } else if (b.kind==='bullet'){
      // bullet sprite + faint trail points
      const pr = b.extra;
      // draw from actual muzzle tip immediately
      // no override to center; position comes from projected world coords
      // Scale with distance: start 20px, shrink to 4px with traveled distance
      const t = Math.min(1, (pr?.travel||0) / 6); // 0..1 over ~6 tiles
      const s = 20 - t * 16;
      const rise = Math.max(0, Math.min(H*0.35, ((pr?.z)||0) * (H*0.12)));
      let x0 = (b.x + shakeX) - s/2, y0 = (horizon - s*0.2) - rise + shakeY;
      // optional muzzle flash when just fired (at tip position if available)
      if (pr.from==='player' && (pr.age||0) < 0.03){
        const tip = state.muzzleScreen;
        if (tip){ const cx = tip.frontX; const cy = tip.frontY; ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.6; ctx.beginPath(); ctx.arc(cx, cy, Math.max(12, s*2.0), 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill(); ctx.restore(); }
      }
      ctx.fillStyle='#fff'; ctx.fillRect(x0,y0,s,s);
      if (pr.trail && pr.trail.length){
        ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle='#ffffff';
        for(const t of pr.trail){ const tb = projectBillboard(p,W,t.x,t.y); if(tb){ const sx=tb.x-1 + shakeX, sy=(horizon - s*0.2) + shakeY; ctx.fillRect(sx, sy, 2, 2); } }
        ctx.restore();
      }
    } else {
      const pr = b.extra;
      const s = Math.max(2, b.s*0.18);
      const rise = Math.max(0, Math.min(H*0.35, ((pr?.z)||0) * (H*0.12)));
      ctx.fillStyle='#fff';
      const x = (b.x + shakeX) - s/2, y = (horizon - s*0.2) - rise + shakeY;
      ctx.fillRect(x,y,s,s);
    }
  }

  // Player hit flash
  if((state.hitFlash||0) > 0){
    ctx.save(); ctx.globalAlpha = Math.min(0.35, state.hitFlash);
    ctx.fillStyle = '#ff0000'; ctx.fillRect(0,0,W,H);
    ctx.restore();
    state.hitFlash = Math.max(0, state.hitFlash - 0.05);
  }

  if(paused){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font=`${Math.floor(W*0.05)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }
  if(state.won){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#9cff9c'; ctx.font=`${Math.floor(W*0.045)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('LEVEL COMPLETE', W/2, H/2); }
}