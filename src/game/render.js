import { MAX_DEPTH, STEP } from './constants.js';
import { clamp, tileAt } from './utils.js';
import { projectBillboard } from './visibility.js';
import { drawCube3D, drawRectPrism3D } from './draw.js';

export function render(state, ctx, cv, paused=false){
  const W=cv.width, H=cv.height; const p=state.player;
  const bob = Math.sin(state.last*0.016*(Math.hypot(state.moveVec.x,state.moveVec.y)>0.001?1:0)) * (H*0.004);
  const horizon = H/2 + Math.tan(p.pitch)*H*0.25 + bob;
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
    const x0=Math.floor(i*colW);
    ctx.fillStyle=color; ctx.fillRect(x0, horizon-wallH/2, Math.ceil(colW)+1, wallH);
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
      if(a && b){ ctx.beginPath(); ctx.moveTo(a.x, horizon); ctx.lineTo(b.x, horizon); ctx.stroke(); }
    }
    ctx.restore();
  }

  // draw a simple 3D muzzle at bottom-left that aims to crosshair
  (function drawMuzzle(){
    const muzzleW = Math.max(8, W*0.06);
    const muzzleH = Math.max(8, H*0.04);
    const muzzleD = Math.max(6, W*0.03);
    const cx = W/2; // center bottom
    const cy = H - Math.max(12, H*0.08);
    // Aim orientation: yaw follows look X, pitch follows player pitch (up is negative screen tilt)
    const yaw = (state.turnStickX||0) * 0.6;
    const pitch = -(p.pitch||0) * 0.8 + (state.turnStickY||0) * 0.3;
    const roll = Math.sin(state.last*0.01)*0.08; // subtle hand sway
    drawRectPrism3D(ctx, cx, cy, muzzleW, muzzleH, muzzleD, yaw, pitch, roll, 'rgb(200,200,200)');
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
      const x = b.x; const yCenter = horizon - (b.s*0.7) + ( (e.zBase + Math.sin(e.t)*e.bobAmp) * (H*0.08) );
      drawCube3D(ctx, x, yCenter, cubeSize, e.rot, e.color);
      ctx.fillStyle='#000'; ctx.fillRect(x - cubeSize/2, yCenter - cubeSize/2 - 8, cubeSize, 6);
      ctx.fillStyle='#fff'; ctx.fillRect(x - cubeSize/2, yCenter - cubeSize/2 - 8, cubeSize*(b.hp/100), 6);
    } else if (b.kind==='laser'){
      const pr = b.extra;
      const s = Math.max(3, spriteW*0.22);
      const rise = Math.max(0, Math.min(H*0.35, ((pr?.z)||0) * (H*0.12)));
      const x = b.x; const y = (horizon - s*0.2) - rise;
      ctx.save(); ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=0.35; ctx.beginPath(); ctx.arc(x, y, s*1.6, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();
      ctx.globalAlpha=1; ctx.beginPath(); ctx.arc(x, y, Math.max(1, s*0.6), 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();
      ctx.restore();
    } else if (b.kind==='laserTrail'){
      const s = Math.max(2, spriteW*0.16);
      const x = b.x; const y = horizon - s*0.2;
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha = 0.08 + 0.22*(b.extra.alpha||0.5); ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill(); ctx.globalAlpha=1; ctx.restore();
    } else if (b.kind==='particle'){
      const part=b.extra;
      const s = Math.max(2, b.s * part.size * 0.6);
      const groundY = H - s - 2;
      const hPix = (H*0.12) * Math.max(0, part.h||0);
      const x = b.x - s/2;
      const y = (part.h <= 0.001) ? groundY : (groundY - hPix);
      const lifeAlpha = clamp(part.ttl/1.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75*lifeAlpha;
      ctx.fillStyle = part.color;
      ctx.fillRect(x, y, s, s);
      ctx.restore();
    } else if (b.kind==='bullet'){
      // bullet sprite + faint trail points
      const pr = b.extra;
      // ensure bullets originate visually from center-bottom muzzle for first frames
      if (pr.from==='player' && (pr.age||0) < 0.05){
        const muzzleH = Math.max(8, H*0.04);
        const cx = W/2; const cy = H - Math.max(12, H*0.08);
        b.x = cx; // override screen x briefly to connect with muzzle
      }
      // Scale with distance: start 20px, shrink to 4px with traveled distance
      const t = Math.min(1, (pr?.travel||0) / 6); // 0..1 over ~6 tiles
      const s = 20 - t * 16;
      const rise = Math.max(0, Math.min(H*0.35, ((pr?.z)||0) * (H*0.12)));
      const x0 = b.x - s/2, y0 = (horizon - s*0.2) - rise;
      ctx.fillStyle='#fff'; ctx.fillRect(x0,y0,s,s);
      if (pr.trail && pr.trail.length){
        ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle='#ffffff';
        for(const t of pr.trail){ const tb = projectBillboard(p,W,t.x,t.y); if(tb){ const sx=tb.x-1, sy=(horizon - s*0.2); ctx.fillRect(sx, sy, 2, 2); } }
        ctx.restore();
      }
    } else {
      const pr = b.extra;
      const s = Math.max(2, b.s*0.18);
      const rise = Math.max(0, Math.min(H*0.35, ((pr?.z)||0) * (H*0.12)));
      ctx.fillStyle='#fff';
      const x = b.x - s/2, y = (horizon - s*0.2) - rise;
      ctx.fillRect(x,y,s,s);
    }
  }

  if(paused){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font=`${Math.floor(W*0.05)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }
}