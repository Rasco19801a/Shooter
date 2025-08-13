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
    const sunR = Math.max(10, Math.min(W,H)*0.028);
    const sunParallax = 0.35; // appear further away than mountains
    const sunX = W * (0.5 + (delta / p.fov) * sunParallax);
    const sunY = Math.max(30, horizon*0.35 + Math.cos(state.last*0.00015)*H*0.03);
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI*2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    // glow
    const glowR = sunR * 2.6;
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
    glow.addColorStop(0,'rgba(255,255,255,0.30)');
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
  // extra far subtle ridge (increased frequencies -> meer heuvels)
  drawHills(H*0.02, H*0.05, 2.5, '#cfe1f0', 0.35);
  drawHills(H*0.06, H*0.08, 1.8, '#9bb6cc', 0.6);
  drawHills(H*0.12, H*0.09, 1.4, '#90afc7', 0.65);
  drawHills(H*0.18, H*0.10, 1.1, '#7fa0bb', 0.7);
  drawHills(H*0.24, H*0.12, 0.9, '#5a7d99', 0.9);
  // nearer foreground undulation
  drawHills(H*0.30, H*0.14, 0.70, '#426981', 1.0);
  // add more varied hill layers to reach ~10 distinct ridges
  drawHills(H*0.08, H*0.07, 2.2, '#bdd3e6', 0.45);
  drawHills(H*0.15, H*0.11, 1.3, '#89a8c2', 0.6);
  drawHills(H*0.21, H*0.12, 1.0, '#6c8da9', 0.75);
  drawHills(H*0.27, H*0.13, 0.85, '#50758f', 0.9);

  // abstract hemispheres spread across the landscape
  function fract(x){ return x - Math.floor(x); }
  function drawHemisphere(cx, baseY, r, fillColor, alpha){
    ctx.save();
    ctx.globalAlpha = alpha;
    // simple shading for an abstract look
    const grad = ctx.createRadialGradient(cx, baseY - r*0.7, r*0.1, cx, baseY - r*0.2, r*1.2);
    grad.addColorStop(0, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, fillColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, baseY, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function drawHemispheres(){
    const palette = ['#e6f0f8', '#d3e4f1', '#b7c9d8', '#a5bfd4'];
    const layers = [
      // ver weg: kleinere bollen
      { count: 9, depth: 0.12, yOffset: H*0.09, rMin: H*0.010, rMax: H*0.022, alpha:0.45 },
      { count: 7, depth: 0.28, yOffset: H*0.15, rMin: H*0.014, rMax: H*0.030, alpha:0.60 },
      // dichtbij: alleen grote halve bollen
      { count: 4, depth: 0.65, yOffset: H*0.28, rMin: H*0.085, rMax: H*0.120, alpha:0.85 },
      { count: 3, depth: 0.80, yOffset: H*0.34, rMin: H*0.100, rMax: H*0.160, alpha:0.90 },
    ];
    for(const layer of layers){
      for(let i=0;i<layer.count;i++){
        const base = i / layer.count + layer.depth*0.27;
        const parallax = viewPan*(0.06*layer.depth + 0.015);
        const travel = movePhase*(0.10*layer.depth + 0.02);
        const x = fract(base + parallax - travel) * W;
        const r = layer.rMin + fract(Math.sin(i*12.9898)*43758.5453) * (layer.rMax - layer.rMin);
        const y = horizon + layer.yOffset;
        const color = palette[i % palette.length];
        drawHemisphere(x, y, r, color, layer.alpha);
      }
    }
  }
  drawHemispheres();

  // foreground ground gradient (light near horizon to darker near bottom)
  const grd = ctx.createLinearGradient(0,horizon,0,H);
  grd.addColorStop(0,'#e9f5ff');
  grd.addColorStop(1,'#b7c9d8');
  ctx.fillStyle=grd; ctx.fillRect(0,horizon,W,H-horizon);

  // Draw white ground circle indicating movement boundary and render monoliths around
  if(state.outside){
    // Project world center to screen: since we use painterly outside, approximate center at screen center horizontally, and near ground at some y
    const cx = W*0.5; // approximate
    const cy = horizon + H*0.25; // on ground a bit below horizon
    const worldRadius = (state.outsideRadius || 6);
    // Convert to screen pixels: scale relative to canvas height
    const pxRadius = Math.max(24, Math.min(W,H) * (worldRadius / 20));
    ctx.save();
    // perspectief: plat op de grond als ellipse, gevuld en zonder rand
    const yRadius = pxRadius * 0.28;
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(cx, cy, pxRadius, yRadius, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Monoliths around the circle
    const mons = state.outsideMonoliths || [];
    for(const m of mons){
      const ang = m.angle - p.dir; // relative to view dir for parallax
      const x = cx + Math.cos(ang) * pxRadius;
      const y = cy + Math.sin(ang) * pxRadius;
      const hPx = Math.min(H*0.35, Math.max(H*0.12, m.height/4 * H*0.25));
      const wPx = Math.max(4, m.width/4 * W*0.02);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(m.tilt + Math.sin(state.last*0.0001 + ang)*0.02);
      // simple vertical slab with top cap
      const grad = ctx.createLinearGradient(0,-hPx,0,hPx);
      grad.addColorStop(0,'#eaeff5');
      grad.addColorStop(1,'#8aa2b6');
      ctx.fillStyle = grad;
      ctx.fillRect(-wPx*0.5, -hPx, wPx, hPx);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(0, -hPx, wPx*0.6, wPx*0.25, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

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