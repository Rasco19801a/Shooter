import { MAX_DEPTH, STEP } from './constants.js';
import { clamp, tileAt } from './utils.js';

// Check ray intersection with a rotated rectangular block
function rayBlockIntersection(rayOrigin, rayDir, block) {
  // Transform ray to block's local space
  const dx = rayOrigin.x - block.x;
  const dy = rayOrigin.y - block.y;
  const cos = Math.cos(-block.rotation);
  const sin = Math.sin(-block.rotation);
  
  const localOrigin = {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos
  };
  
  const localDir = {
    x: rayDir.x * cos - rayDir.y * sin,
    y: rayDir.x * sin + rayDir.y * cos
  };
  
  // Block bounds in local space
  const halfWidth = block.width / 2;
  const halfDepth = block.depth / 2;
  
  // Ray-box intersection in 2D
  let tmin = -Infinity;
  let tmax = Infinity;
  
  // X axis
  if (Math.abs(localDir.x) > 0.0001) {
    const t1 = (-halfWidth - localOrigin.x) / localDir.x;
    const t2 = (halfWidth - localOrigin.x) / localDir.x;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else if (Math.abs(localOrigin.x) > halfWidth) {
    return null;
  }
  
  // Y axis
  if (Math.abs(localDir.y) > 0.0001) {
    const t1 = (-halfDepth - localOrigin.y) / localDir.y;
    const t2 = (halfDepth - localOrigin.y) / localDir.y;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else if (Math.abs(localOrigin.y) > halfDepth) {
    return null;
  }
  
  if (tmin <= tmax && tmax >= 0 && tmin < MAX_DEPTH) {
    return Math.max(0, tmin);
  }
  
  return null;
}

function renderOutside(state, ctx, cv){
  const W=cv.width, H=cv.height; const p=state.player;
  const bob = Math.sin(state.last*0.016*(state.isMoving?1:0)) * (H*0.004);
  const horizon = H/2 + Math.tan(p.pitch)*H*0.22 + bob;

  // sky gradient (light to darker towards horizon)
  const sky = ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,'#ffffff');
  sky.addColorStop(1,'#a9cfff');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,horizon);

  // Sun that respects camera yaw and can leave view (no wrap)
  function normalizeAngle(a){ 
    while(a>Math.PI) a-=Math.PI*2; 
    while(a<-Math.PI) a+=Math.PI*2; 
    return a; 
  }
  if(state.sunAzimuth === undefined){ 
    state.sunAzimuth = Math.PI*0.2; 
  }
  // very slow drift for life
  state.sunAzimuth += 0.00001 * ((H+W)/1000);
  const delta = normalizeAngle(state.sunAzimuth - p.dir);
  const sunR = Math.max(10, Math.min(W,H)*0.028);
  const sunY = Math.max(30, horizon*0.35 + Math.cos(state.last*0.00015)*H*0.03);
  // Draw sun only if it is within the current field of view
  if (Math.abs(delta) < p.fov * 0.5) {
    const sunX = W * (0.5 + (delta / p.fov) * 0.5);
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
    const palette = ['#f2f2f2', '#dedede', '#c9c9c9', '#b3b3b3', '#9e9e9e', '#8a8a8a', '#737373', '#5e5e5e'];
    const layers = [
      // ver weg: kleinere bollen
      { count: 9, depth: 0.12, yOffset: H*0.09, rMin: H*0.010, rMax: H*0.022, alpha:0.45 },
      { count: 7, depth: 0.28, yOffset: H*0.15, rMin: H*0.014, rMax: H*0.030, alpha:0.60 },
      // horizon: 10 grotere heuvels (2–5x groter dan de kleine verweg)
      { count: 10, depth: 0.20, yOffset: H*0.03, rMin: H*0.025, rMax: H*0.110, alpha:0.70 },
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

  // Render outside blocks using raycasting
  if(state.outside && state.outsideBlocks && state.outsideBlocks.length > 0){
    const cols = Math.floor(W/2);
    const colW = W/cols;
    const depths = new Array(cols);
    const correctedArr = new Array(cols);
    const hitArr = new Array(cols);

    // Pass 1: gather intersections and depths
    for(let i = 0; i < cols; i++){
      const camX = (i/cols - 0.5) * p.fov;
      const ray = p.dir + camX;
      const rayDir = { x: Math.cos(ray), y: Math.sin(ray) };
      const rayOrigin = { x: p.x, y: p.y };
      
      let closestDist = MAX_DEPTH;
      let hitBlock = false;
      
      // Check intersection with all blocks
      for(const block of state.outsideBlocks){
        const dist = rayBlockIntersection(rayOrigin, rayDir, block);
        if(dist !== null && dist < closestDist){
          closestDist = dist;
          hitBlock = true;
        }
      }
      depths[i] = closestDist;
      const corrected = closestDist * Math.cos(camX);
      correctedArr[i] = corrected;
      hitArr[i] = hitBlock && closestDist < MAX_DEPTH;
    }

    // Pass 2: draw with softened near shading and gentler ambient occlusion
    for(let i = 0; i < cols; i++){
      if(!hitArr[i]) continue;
      const corrected = correctedArr[i];
      const wallH = Math.min(H, (H/(corrected + 0.0001)) * 0.7);
      // Softer near shading: raise minimum luminance so nearby blocks are less dark
      const minLum = 0.45; // 0..1
      const lum = minLum + (1 - minLum) * clamp(corrected/15, 0, 1);
      let g = Math.floor(255 * lum);
      // Screen-space AO from neighbor depth differences (reduced 50%)
      const c = correctedArr[i];
      const l = i>0 ? correctedArr[i-1] : c;
      const r = i<cols-1 ? correctedArr[i+1] : c;
      const ao = clamp((Math.abs(l - c) + Math.abs(r - c)) * 0.10, 0, 0.325);
      g = Math.max(0, Math.min(255, Math.floor(g * (1 - ao))));
      // Vertical edge AO: darken near ground and top to emphasize contact shadows (reduced 50%)
      const x0 = Math.floor(i * colW);
      const yTop = horizon - wallH/2;
      const yBot = yTop + wallH;
      const edgeAO = clamp(0.175 * (1 - clamp(corrected/12, 0, 1)), 0, 0.175);
      const gTop = Math.floor(g * (1 - edgeAO));
      const gMid = g;
      const gBot = Math.floor(g * (1 - edgeAO));
      const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
      grad.addColorStop(0, `rgb(${gTop},${gTop},${gTop})`);
      grad.addColorStop(0.5, `rgb(${gMid},${gMid},${gMid})`);
      grad.addColorStop(1, `rgb(${gBot},${gBot},${gBot})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x0, yTop, Math.ceil(colW) + 1, wallH);
    }

    // Pass 3: very light ground contact shadow below outside blocks
    for(let i = 0; i < cols; i++){
      if(!hitArr[i]) continue;
      const corrected = correctedArr[i];
      const wallH = Math.min(H, (H/(corrected + 0.0001)) * 0.7);
      const x0 = Math.floor(i * colW);
      const yTop = horizon - wallH/2;
      const yBot = yTop + wallH;
      if(!isFinite(yBot)) continue;
      const nearFactor = clamp(1 - corrected/12, 0, 1);
      const contact = clamp(0.12 * nearFactor, 0, 0.12);
      const shadowLen = Math.max(4, Math.floor(4 + 4 * nearFactor));
      const grad = ctx.createLinearGradient(0, yBot, 0, yBot + shadowLen);
      grad.addColorStop(0, `rgba(0,0,0,${contact})`);
      grad.addColorStop(0.5, `rgba(0,0,0,${contact * 0.3})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x0, Math.floor(yBot), Math.ceil(colW) + 1, shadowLen);
    }
  }

  // subtle atmospheric perspective overlay
  if(state.enableOutsideFog){
    const fog = ctx.createLinearGradient(0, horizon - H*0.08, 0, H);
    fog.addColorStop(0,'rgba(255,255,255,0.10)');
    fog.addColorStop(1,'rgba(0,0,0,0.18)');
    ctx.fillStyle=fog; ctx.fillRect(0, Math.max(0, horizon - H*0.08), W, H);
  }

  // floating fluffs (pluisjes) overlay
  if(state.enableOutsideParticles){
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

    // Lighten floor to make AO/contact shadows visible and add subtle ceiling
    {
      const ceil = ctx.createLinearGradient(0, 0, 0, horizon);
      ceil.addColorStop(0, '#0a0a0a');
      ceil.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = ceil; ctx.fillRect(0, 0, W, Math.max(0, Math.floor(horizon)));

      const floor = ctx.createLinearGradient(0, horizon, 0, H);
      floor.addColorStop(0, '#f2f2f2');
      floor.addColorStop(1, '#d6d6d6');
      ctx.fillStyle = floor; ctx.fillRect(0, Math.max(0, Math.floor(horizon)), W, Math.max(0, H - Math.floor(horizon)));
    }

    const cols=Math.floor(W/2); const colW=W/cols; const depths = new Array(cols);
    const correctedArr = new Array(cols);
    const hitArr = new Array(cols);
    const yBotArr = new Array(cols);

    // Pass 1: raycast and store
    for(let i=0;i<cols;i++){
      const camX=(i/cols-0.5)*p.fov; const ray=p.dir+camX;
      let dist=0, hit=0; let x=p.x, y=p.y; const sx=Math.cos(ray)*STEP, sy=Math.sin(ray)*STEP;
      for(dist=0; dist<MAX_DEPTH; dist+=STEP){ x+=sx; y+=sy; const t=tileAt(x,y); if(t===1||t===2){ hit=t; break; } }
      const corrected=dist*Math.cos(camX); depths[i] = corrected; correctedArr[i] = corrected; hitArr[i] = hit; 
    }

    // Pass 2: draw walls with AO
    for(let i=0;i<cols;i++){
      const corrected = correctedArr[i];
      const hit = hitArr[i];
      const horizon = H/2 + Math.tan(p.pitch)*H*0.25 + bob;
      const wallH=Math.min(H, (H/(corrected+0.0001))*0.9);
      const shade=clamp(1 - corrected/10, 0, 1);
      let g=Math.floor(255*shade);
      if(hit===2){ const gg=Math.floor(200 + 55*shade); g = gg; }
      // AO based on neighbor depth differences (reduced 50%)
      const c = correctedArr[i];
      const l = i>0 ? correctedArr[i-1] : c;
      const r = i<cols-1 ? correctedArr[i+1] : c;
      const ao = clamp((Math.abs(l - c) + Math.abs(r - c)) * 0.125, 0, 0.35);
      g = Math.max(0, Math.min(255, Math.floor(g * (1 - ao))));
      // Vertical edge AO on walls for floor/ceiling contact (reduced 50%)
      const x0=Math.floor(i*colW);
      const yTop = horizon - wallH/2;
      const yBot = yTop + wallH;
      yBotArr[i] = yBot;
      const edgeAO = clamp(0.225 * (1 - clamp(corrected/12, 0, 1)), 0, 0.225);
      const gTop = Math.floor(g * (1 - edgeAO));
      const gMid = g;
      const gBot = Math.floor(g * (1 - edgeAO));
      const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
      grad.addColorStop(0, `rgb(${gTop},${gTop},${gTop})`);
      grad.addColorStop(0.5, `rgb(${gMid},${gMid},${gMid})`);
      grad.addColorStop(1, `rgb(${gBot},${gBot},${gBot})`);
      ctx.fillStyle=grad; ctx.fillRect(x0, yTop, Math.ceil(colW)+1, wallH);
    }

    // Pass 3: draw ground contact shadow (ambient occlusion) below walls (softer and shorter)
    for(let i=0;i<cols;i++){
      if(!hitArr[i]) continue;
      const x0 = Math.floor(i*colW);
      const yBot = yBotArr[i];
      if(!isFinite(yBot)) continue;
      const c = correctedArr[i];
      const l = i>0 ? correctedArr[i-1] : c;
      const r = i<cols-1 ? correctedArr[i+1] : c;
      const edgeContrast = clamp((Math.abs(l - c) + Math.abs(r - c)) * 0.5, 0, 1);
      const nearFactor = clamp(1 - c/12, 0, 1);
      const contact = clamp(0.175*nearFactor + 0.125*edgeContrast, 0, 0.325);
      const maxShadow = Math.max(6, Math.floor((H - yBot) * 0.18));
      const shadowLenBase = 8;
      const shadowLen = Math.max(6, Math.floor(shadowLenBase + (maxShadow - shadowLenBase) * (nearFactor * 0.8)));
      const grad = ctx.createLinearGradient(0, yBot, 0, yBot + shadowLen);
      grad.addColorStop(0, `rgba(0,0,0,${contact})`);
      grad.addColorStop(0.4, `rgba(0,0,0,${contact * 0.4})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x0, Math.floor(yBot), Math.ceil(colW)+1, shadowLen);
    }
  }

  if(paused){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font=`${Math.floor(W*0.05)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }
  if(state.won){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#9cff9c'; ctx.font=`${Math.floor(W*0.045)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('LEVEL COMPLETE', W/2, H/2); }

  // Final greyscale post-process: remove all colors from the world
  try {
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      const y = Math.round(0.2126*r + 0.7152*g + 0.0722*b);
      d[i] = y; d[i+1] = y; d[i+2] = y; // preserve alpha
    }
    ctx.putImageData(img, 0, 0);
  } catch (e) {
    // ignore if not available
  }
}