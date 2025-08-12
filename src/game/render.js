import { MAX_DEPTH, STEP } from './constants.js';
import { clamp, tileAt } from './utils.js';

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
    ctx.fillStyle=color; ctx.fillRect(x0, horizon - wallH/2, Math.ceil(colW)+1, wallH);
  }

  if(paused){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font=`${Math.floor(W*0.05)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('PAUSED', W/2, H/2); }
  if(state.won){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#9cff9c'; ctx.font=`${Math.floor(W*0.045)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('LEVEL COMPLETE', W/2, H/2); }
}