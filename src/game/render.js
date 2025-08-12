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

  // sun as pure white disk + soft glow
  const sunX = W*0.72 + Math.sin(state.last*0.0002)*W*0.05;
  const sunY = Math.max(30, horizon*0.35 + Math.cos(state.last*0.00015)*H*0.03);
  const sunR = Math.max(12, Math.min(W,H)*0.035);
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI*2);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  // glow
  const glowR = sunR * 3.2;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
  glow.addColorStop(0,'rgba(255,255,255,0.35)');
  glow.addColorStop(1,'rgba(255,255,255,0.0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX, sunY, glowR, 0, Math.PI*2); ctx.fill();

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
  drawHills(H*0.06, H*0.08, 1.2, '#9bb6cc', 0.6);
  drawHills(H*0.14, H*0.10, 0.9, '#7fa0bb', 0.7);
  drawHills(H*0.24, H*0.12, 0.6, '#5a7d99', 0.9);

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