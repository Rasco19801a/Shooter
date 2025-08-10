import { LOOK_RADIUS, DEADZONE } from '../game/constants.js';
import { clamp } from '../game/utils.js';

export function attachTouchControls(root, state){
  if(!root) return ()=>{};

  const left=document.createElement('div');
  Object.assign(left.style,{position:'absolute',left:'0',bottom:'0',width:'50%',height:'55%',touchAction:'none',background:'transparent',zIndex:5});

  const right=document.createElement('div');
  Object.assign(right.style,{position:'absolute',right:'0',bottom:'0',width:'50%',height:'55%',touchAction:'none',background:'transparent',zIndex:5});

  root.appendChild(left); root.appendChild(right);

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
    state.turnStickY = -ny;
    e.preventDefault();
  }
  function onEndR(e){ if(!R.active){ e.preventDefault(); return; } state.turnStickX = 0; state.turnStickY = 0; R.active=false; e.preventDefault(); }
  right.addEventListener('touchstart',onStartR,{passive:false});
  right.addEventListener('touchmove',onMoveR,{passive:false});
  right.addEventListener('touchend',onEndR,{passive:false});
  right.addEventListener('touchcancel',onEndR,{passive:false});

  return ()=>{ try{ root.removeChild(left); root.removeChild(right);}catch{} };
}