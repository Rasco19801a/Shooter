import { MAX_DEPTH, STEP } from './constants.js';
import { clamp, tileAt } from './utils.js';

function renderOutside(state, ctx, cv){
  const W=cv.width, H=cv.height; const p=state.player;
  const bob = Math.sin(state.last*0.016*(state.isMoving?1:0)) * (H*0.004);
  const horizon = H/2 + Math.tan(p.pitch)*H*0.22 + bob;

  // sky gradient
  const sky = ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,'#ffffff');
  sky.addColorStop(1,'#cfe8ff');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,horizon);

  // sun as pure white disk
  const sunX = W*0.72 + Math.sin(state.last*0.0002)*W*0.05;
  const sunY = Math.max(30, horizon*0.35 + Math.cos(state.last*0.00015)*H*0.03);
  const sunR = Math.max(12, Math.min(W,H)*0.035);
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI*2);
  ctx.fillStyle = '#ffffff'; ctx.fill();

  // distant mountains silhouettes (abstract, flowing)
  function drawHills(offsetY, amp, freq, color, alpha){
    ctx.beginPath();
    ctx.moveTo(0,H);
    for(let x=0;x<=W;x+=4){
      const t = (x/W)*Math.PI*2*freq + state.last*0.0001;
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

  // foreground rolling ground
  const grd = ctx.createLinearGradient(0,horizon,W,H);
  grd.addColorStop(0,'#e9f5ff');
  grd.addColorStop(1,'#cfe3f2');
  ctx.fillStyle=grd; ctx.fillRect(0,horizon,W,H-horizon);

  // soft ground waves
  ctx.strokeStyle='rgba(120,160,190,0.35)';
  ctx.lineWidth = Math.max(1, Math.floor(W*0.002));
  for(let i=0;i<6;i++){
    ctx.beginPath();
    for(let x=0;x<=W;x+=6){
      const t = (x/W)*Math.PI*2*(0.5+i*0.15) + state.last*0.00012*(1+i*0.2);
      const y = horizon + H*0.02*i + Math.sin(t)*H*(0.004+0.002*i);
      if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
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