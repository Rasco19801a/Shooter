import { MAX_DEPTH, STEP } from './constants.js';
import { clamp, tileAt } from './utils.js';

function renderOutside(state, ctx, cv){
  const W=cv.width, H=cv.height; const p=state.player;
  const bob = Math.sin(state.last*0.016*(state.isMoving?1:0)) * (H*0.004);
  const horizon = H/2 + Math.tan(p.pitch)*H*0.22 + bob;

  // sky gradient (light to darker towards horizon)
  const sky = ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,'#ffffff');
  sky.addColorStop(1,'#b9dbff');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,horizon);

  // Sun that respects camera yaw: moves in/out of view as you look around
  function normalizeAngle(a){ while(a>Math.PI) a-=Math.PI*2; while(a<-Math.PI) a+=Math.PI*2; return a; }
  if(state.sunAzimuth === undefined){ state.sunAzimuth = Math.PI*0.2; }
  // very slow drift for life
  state.sunAzimuth += 0.00001 * ((H+W)/1000);
  const delta = normalizeAngle(state.sunAzimuth - p.dir);
  const sunVisible = Math.abs(delta) < (p.fov*0.55);
  if(sunVisible){
    const sunR = Math.max(12, Math.min(W,H)*0.035);
    const sunX = W * (0.5 + delta / p.fov);
    const sunY = Math.max(30, horizon*0.35 + Math.cos(state.last*0.00015)*H*0.03);
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI*2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    // glow
    const glowR = sunR * 3.2;
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
    glow.addColorStop(0,'rgba(255,255,255,0.35)');
    glow.addColorStop(1,'rgba(255,255,255,0.0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX, sunY, glowR, 0, Math.PI*2); ctx.fill();
  }

  // distant mountains with subtle parallax from yaw/position
  const viewPan = p.dir;
  const movePhase = (p.x + p.y) * 0.35;
  function drawHills(offsetY, amp, freq, color, alpha){
    ctx.beginPath();
    ctx.moveTo(0,H);
    for(let x=0;x<=W;x+=4){
      const t = (x/W)*Math.PI*2*freq + viewPan*freq*1.2 - movePhase*0.8 + state.last*0.00008;
      const y = horizon + offsetY + Math.sin(t)*amp + Math.sin(t*0.37+1.3)*amp*0.35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W,H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // extra far subtle ridge
  drawHills(H*0.02, H*0.05, 1.8, '#cfe1f0', 0.35);
  drawHills(H*0.06, H*0.08, 1.2, '#9bb6cc', 0.6);
  drawHills(H*0.14, H*0.10, 0.9, '#7fa0bb', 0.7);
  drawHills(H*0.24, H*0.12, 0.6, '#5a7d99', 0.9);
  // nearer foreground undulation
  drawHills(H*0.30, H*0.14, 0.45, '#426981', 1.0);

  // dome-shaped buildings sprinkled across layers with gentle parallax
  function fract(x){ return x - Math.floor(x); }
  function drawDome(cx, baseY, r, fillColor, strokeColor, alpha){
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, baseY, r, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    if(strokeColor){
      ctx.lineWidth = Math.max(1, r*0.08);
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
    // small spire/antenna detail for variety
    ctx.beginPath();
    ctx.moveTo(cx, baseY - r);
    ctx.lineTo(cx, baseY - r - r*0.25);
    ctx.strokeStyle = strokeColor || fillColor;
    ctx.lineWidth = Math.max(1, r*0.05);
    ctx.stroke();
    ctx.restore();
  }
  function drawDomes(){
    const layers = [
      { count: 6, depth: 0.15, yOffset: H*0.10, rMin: H*0.012, rMax: H*0.022, color:'#e6f0f8', stroke:'#cfdde9', alpha:0.55 },
      { count: 5, depth: 0.35, yOffset: H*0.16, rMin: H*0.016, rMax: H*0.03,  color:'#d3e4f1', stroke:'#b9cfe0', alpha:0.65 },
      { count: 4, depth: 0.60, yOffset: H*0.22, rMin: H*0.022, rMax: H*0.04,  color:'#b7c9d8', stroke:'#94a9bb', alpha:0.80 },
    ];
    for(const layer of layers){
      for(let i=0;i<layer.count;i++){
        const base = i / layer.count + layer.depth*0.27;
        const parallax = viewPan*(0.08*layer.depth + 0.02);
        const travel = movePhase*(0.12*layer.depth + 0.02);
        const x = fract(base + parallax - travel) * W;
        const r = layer.rMin + fract(Math.sin(i*12.9898)*43758.5453) * (layer.rMax - layer.rMin);
        const y = horizon + layer.yOffset;
        drawDome(x, y, r, layer.color, layer.stroke, layer.alpha);
      }
    }
  }
  drawDomes();

  // foreground ground gradient (light near horizon to darker near bottom)
  const grd = ctx.createLinearGradient(0,horizon,0,H);
  grd.addColorStop(0,'#e9f5ff');
  grd.addColorStop(1,'#b7c9d8');
  ctx.fillStyle=grd; ctx.fillRect(0,horizon,W,H-horizon);

  // subtle atmospheric perspective overlay
  const fog = ctx.createLinearGradient(0, horizon - H*0.08, 0, H);
  fog.addColorStop(0,'rgba(255,255,255,0.10)');
  fog.addColorStop(1,'rgba(0,0,0,0.18)');
  ctx.fillStyle=fog; ctx.fillRect(0, Math.max(0, horizon - H*0.08), W, H);

  // floating fluffs (pluisjes) overlay
  if(!state.outsideParticles){
    const count = Math.max(24, Math.floor((W*H)/220000));
    state.outsideParticles = {
      tLast: state.last,
      items: Array.from({length: count}, (_,i)=>{
        const r = 1.0 + Math.random()*2.6;
        return {
          x: Math.random()*W,
          y: Math.random()*H,
          r,
          vx: (Math.random()*0.04 - 0.02),
          vy: -(0.02 + Math.random()*0.05),
          phase: Math.random()*Math.PI*2,
          alpha: 0.15 + Math.random()*0.25,
        };
      })
    };
  }
  {
    const ps = state.outsideParticles; const now = state.last; const dt = Math.min(0.05, Math.max(0, (now - ps.tLast)/1000)); ps.tLast = now;
    for(const it of ps.items){
      const sway = Math.sin(now*0.0009 + it.phase) * 0.02;
      it.x += (it.vx + sway) * dt * W;
      it.y += it.vy * dt * H * 0.1;
      // wrap/reseed when out of view
      const m = 10;
      if(it.y < -m || it.x < -m || it.x > W+m){
        it.x = Math.random()*W;
        it.y = H + m + Math.random()*H*0.15;
        it.vx = (Math.random()*0.04 - 0.02);
        it.vy = -(0.02 + Math.random()*0.05);
        it.r = 1.0 + Math.random()*2.6;
        it.alpha = 0.15 + Math.random()*0.25;
        it.phase = Math.random()*Math.PI*2;
      }
      // draw soft fluff
      const grad = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, it.r*3.2);
      grad.addColorStop(0, `rgba(255,255,255,${it.alpha})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.r*3.2, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Removed previous stroked ground wave lines to avoid outlines
}

export function render(state, ctx, cv, paused=false){
  const W=cv.width, H=cv.height; const p=state.player;

  if(state.outside){
    renderOutside(state, ctx, cv);
  } else {
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
      const g=Math.floor(255*shade);
      let color = `rgb(${g},${g},${g})`;
      if(hit===2){ const gg=Math.floor(200 + 55*shade); color = `rgb(${gg},${gg},${gg})`; }
      const x0=Math.floor(i*colW);
      ctx.fillStyle=color; ctx.fillRect(x0, horizon - wallH/2, Math.ceil(colW)+1, wallH);
    }
  }

  if(paused){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font=`${Math.floor(W*0.05)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }
  if(state.won){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#9cff9c'; ctx.font=`${Math.floor(W*0.045)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('LEVEL COMPLETE', W/2, H/2); }
}