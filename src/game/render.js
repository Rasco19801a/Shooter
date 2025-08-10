import { MAX_DEPTH, STEP } from './constants.js';
import { clamp, tileAt } from './utils.js';
import { projectBillboard } from './visibility.js';
import { drawCube3D } from './draw.js';

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

  const bills=[];
  for(const e of state.enemies){ if(!e.alive) continue; const b=projectBillboard(p,W,e.x,e.y); if(b){ b.kind='enemy'; b.hp=e.hp; b.extra=e; bills.push(b); } }
  for(const pr of state.projectiles){ const b=projectBillboard(p,W,pr.x,pr.y); if(b){ b.kind=pr.type||'bullet'; b.extra=pr; bills.push(b); } if(pr.type==='laser' && pr.trail){ for(let t=0; t<pr.trail.length; t++){ const pt = pr.trail[t]; const tb = projectBillboard(p,W,pt.x,pt.y); if(tb){ tb.kind='laserTrail'; tb.extra={ alpha: (t+1)/pr.trail.length }; bills.push(tb); } } } }
  for(const part of state.particles){ const b=projectBillboard(p,W,part.x,part.y); if(b){ b.kind='particle'; b.extra=part; bills.push(b); } }
  bills.sort((a,b)=>b.z-a.z);

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
      const s = Math.max(3, spriteW*0.22);
      const x = b.x; const y = horizon - s*0.2;
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
      const hPix = (H*0.12) * Math.max(0, part.h||0);
      const x = b.x - s/2;
      const groundY = horizon - s*0.5;
      const y = (part.h <= 0.001) ? groundY : (horizon - s*0.3) - hPix;
      const lifeAlpha = clamp(part.ttl/1.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75*lifeAlpha;
      ctx.fillStyle = part.color;
      ctx.fillRect(x, y, s, s);
      ctx.restore();
    } else {
      const pr = b.extra;
      const s = Math.max(2, b.s*0.18);
      const rise = Math.max(0, Math.min(H*0.15, ((pr?.z)||0) * (H*0.06)));
      ctx.fillStyle='#fff';
      const x = b.x - s/2, y = (horizon - s*0.2) - rise;
      ctx.fillRect(x,y,s,s);
    }
  }

  if(paused){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font=`${Math.floor(W*0.05)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }
}