import { LOOK_RADIUS, DEADZONE } from '../game/constants.js';
import { clamp } from '../game/utils.js';

export function attachTouchControls(root, state){
  if(!root) return ()=>{};
  const left=document.createElement('div');
  Object.assign(left.style,{position:'absolute',left:'0',bottom:'0',width:'50%',height:'55%',touchAction:'none',background:'transparent',zIndex:5});
  const right=document.createElement('div');
  Object.assign(right.style,{position:'absolute',right:'0',bottom:'0',width:'50%',height:'55%',touchAction:'none',background:'transparent',zIndex:5});
  root.appendChild(left); root.appendChild(right);

  let startL=null, leftId=null;
  function onStartL(e){ const t=e.changedTouches[0]; startL={x:t.clientX,y:t.clientY}; leftId=t.identifier; e.preventDefault(); }
  function onMoveL(e){ if(startL==null) return; let t=null; for(const ct of e.changedTouches){ if(ct.identifier===leftId){ t=ct; break; } } if(!t) return; const dx=t.clientX-startL.x, dy=t.clientY-startL.y; const max=80; const nx=clamp(dx/max,-1,1), ny=clamp(dy/max,-1,1); const p=state.player; const f={x:Math.cos(p.dir), y:Math.sin(p.dir)}, r={x:Math.cos(p.dir+Math.PI/2), y:Math.sin(p.dir+Math.PI/2)}; state.moveVec.x = f.x*(-ny) + r.x*nx; state.moveVec.y = f.y*(-ny) + r.y*nx; e.preventDefault(); }
  function onEndL(e){ let ended=false; for(const ct of e.changedTouches){ if(ct.identifier===leftId){ ended=true; break; } } if(!ended) return; startL=null; leftId=null; state.moveVec.x=0; state.moveVec.y=0; e.preventDefault(); }
  left.addEventListener('touchstart',onStartL,{passive:false});
  left.addEventListener('touchmove',onMoveL,{passive:false});
  left.addEventListener('touchend',onEndL,{passive:false});
  left.addEventListener('touchcancel',onEndL,{passive:false});

  // Pointer events for LEFT (move)
  function onPointerDownL(e){ startL={x:e.clientX,y:e.clientY}; leftId=e.pointerId; e.preventDefault(); }
  function onPointerMoveL(e){ if(startL==null || e.pointerId!==leftId) return; const dx=e.clientX-startL.x, dy=e.clientY-startL.y; const max=80; const nx=clamp(dx/max,-1,1), ny=clamp(dy/max,-1,1); const p=state.player; const f={x:Math.cos(p.dir), y:Math.sin(p.dir)}, r={x:Math.cos(p.dir+Math.PI/2), y:Math.sin(p.dir+Math.PI/2)}; state.moveVec.x = f.x*(-ny) + r.x*nx; state.moveVec.y = f.y*(-ny) + r.y*nx; e.preventDefault(); }
  function onPointerUpL(e){ if(e.pointerId!==leftId) return; startL=null; leftId=null; state.moveVec.x=0; state.moveVec.y=0; e.preventDefault(); }
  left.addEventListener('pointerdown', onPointerDownL);
  left.addEventListener('pointermove', onPointerMoveL);
  left.addEventListener('pointerup', onPointerUpL);
  left.addEventListener('pointercancel', onPointerUpL);

  let R = {active:false, ox:0, oy:0, id:null};
  function onStartR(e){ const t=e.changedTouches[0]; R.active=true; R.ox=t.clientX; R.oy=t.clientY; R.id=t.identifier; e.preventDefault(); }
  function onMoveR(e){ if(!R.active) return; let t=null; for(const ct of e.changedTouches){ if(ct.identifier===R.id){ t=ct; break; } } if(!t) return; const dx = t.clientX - R.ox; const dy = t.clientY - R.oy; let nx = clamp(dx/LOOK_RADIUS, -1, 1); let ny = clamp(dy/LOOK_RADIUS, -1, 1); if (Math.abs(nx) < DEADZONE) nx = 0; else nx = (nx - Math.sign(nx)*DEADZONE) / (1 - DEADZONE); if (Math.abs(ny) < DEADZONE) ny = 0; else ny = (ny - Math.sign(ny)*DEADZONE) / (1 - DEADZONE); state.turnStickX = nx; state.turnStickY = -ny; e.preventDefault(); }
  function onEndR(e){ if(!R.active){ e.preventDefault(); return; } let ended=false; for(const ct of e.changedTouches){ if(ct.identifier===R.id){ ended=true; break; } } if(!ended) return; state.turnStickX = 0; state.turnStickY = 0; R.active=false; R.id=null; e.preventDefault(); }

  // Remove tap-to-fire on right zone; fire is tied to FIRE button hold

  right.addEventListener('touchstart',onStartR,{passive:false});
  right.addEventListener('touchmove',onMoveR,{passive:false});
  right.addEventListener('touchend',onEndR,{passive:false});
  right.addEventListener('touchcancel',onEndR,{passive:false});

  // Pointer events for RIGHT (look)
  let Rptr = {active:false, ox:0, oy:0, id:null};
  function onPointerDownR(e){ Rptr.active=true; Rptr.ox=e.clientX; Rptr.oy=e.clientY; Rptr.id=e.pointerId; e.preventDefault(); }
  function onPointerMoveR(e){ if(!Rptr.active || e.pointerId!==Rptr.id) return; const dx=e.clientX-Rptr.ox; const dy=e.clientY-Rptr.oy; let nx = clamp(dx/LOOK_RADIUS, -1, 1); let ny = clamp(dy/LOOK_RADIUS, -1, 1); if (Math.abs(nx) < DEADZONE) nx = 0; else nx = (nx - Math.sign(nx)*DEADZONE) / (1 - DEADZONE); if (Math.abs(ny) < DEADZONE) ny = 0; else ny = (ny - Math.sign(ny)*DEADZONE) / (1 - DEADZONE); state.turnStickX = nx; state.turnStickY = -ny; e.preventDefault(); }
  function onPointerUpR(e){ if(!Rptr.active || e.pointerId!==Rptr.id) return; state.turnStickX = 0; state.turnStickY = 0; Rptr.active=false; Rptr.id=null; e.preventDefault(); }
  right.addEventListener('pointerdown', onPointerDownR);
  right.addEventListener('pointermove', onPointerMoveR);
  right.addEventListener('pointerup', onPointerUpR);
  right.addEventListener('pointercancel', onPointerUpR);

  // Capture-phase listeners so look works while pressing over FIRE
  function isRightHalf(x){ return x > (window.innerWidth||0)/2; }
  function tsNorm(dx,dy){ let nx = clamp(dx/LOOK_RADIUS, -1, 1), ny = clamp(dy/LOOK_RADIUS, -1, 1); if (Math.abs(nx) < DEADZONE) nx = 0; else nx = (nx - Math.sign(nx)*DEADZONE) / (1 - DEADZONE); if (Math.abs(ny) < DEADZONE) ny = 0; else ny = (ny - Math.sign(ny)*DEADZONE) / (1 - DEADZONE); return {nx, ny}; }

  root.addEventListener('touchstart', (e)=>{
    const t=e.changedTouches[0]; if(!t) return;
    if(isRightHalf(t.clientX)) { R.active=true; R.id=t.identifier; R.ox=t.clientX; R.oy=t.clientY; }
  }, {passive:false, capture:true});

  root.addEventListener('touchmove', (e)=>{
    let t=null; for(const ct of e.changedTouches){ if(ct.identifier===R.id){ t=ct; break; } }
    if(!t) return; const dx=t.clientX-R.ox, dy=t.clientY-R.oy; const {nx,ny}=tsNorm(dx,dy); state.turnStickX = nx; state.turnStickY = -ny; e.preventDefault();
  }, {passive:false, capture:true});

  root.addEventListener('touchend', (e)=>{
    let ended=false; for(const ct of e.changedTouches){ if(ct.identifier===R.id){ ended=true; break; } }
    if(!ended) return; state.turnStickX = 0; state.turnStickY = 0; R.active=false; R.id=null; e.preventDefault();
  }, {passive:false, capture:true});

  root.addEventListener('pointerdown', (e)=>{
    if(isRightHalf(e.clientX)) { Rptr.active=true; Rptr.id=e.pointerId; Rptr.ox=e.clientX; Rptr.oy=e.clientY; }
  }, true);
  root.addEventListener('pointermove', (e)=>{
    if(!Rptr.active || e.pointerId!==Rptr.id) return; const dx=e.clientX-Rptr.ox, dy=e.clientY-Rptr.oy; const {nx,ny}=tsNorm(dx,dy); state.turnStickX = nx; state.turnStickY = -ny; e.preventDefault();
  }, true);
  root.addEventListener('pointerup', (e)=>{
    if(!Rptr.active || e.pointerId!==Rptr.id) return; state.turnStickX = 0; state.turnStickY = 0; Rptr.active=false; Rptr.id=null; e.preventDefault();
  }, true);

  return ()=>{ try{ root.removeChild(left); root.removeChild(right);}catch{} };
}