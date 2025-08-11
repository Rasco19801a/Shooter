import React, { useEffect, useRef, useState } from "react";
import { CONTROL_DIAMETER, LOOK_RADIUS, DEADZONE, FOV, STEP, PITCH_LIMIT } from "../game/constants.js";
import { clamp } from "../game/utils.js";
import { initState, update } from "../game/update.js";
import { render } from "../game/render.js";
import { tryShoot, reload } from "../game/combat.js";
import { attachTouchControls } from "../controls/touchControls.js";
import CircleButton from "../ui/CircleButton.jsx";
import RoundGhost from "../ui/RoundGhost.jsx";
import RoundMiniMap from "../ui/RoundMiniMap.jsx";
import Crosshair40 from "../ui/Crosshair40.jsx";

export default function DoomLiteCanvas(){
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [running,setRunning] = useState(true);
  const [hud,setHud] = useState({ hp:100, ammo:6, score:0, msg:"" });
  const [fps,setFps] = useState(0);
  const gameRef = useRef(null);

  useEffect(()=>{
    const state = initState();
    state.player.fov = FOV;
    gameRef.current = state;

    const kd=e=>{ state.keys[e.code]=true; if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS","Space","KeyR"].includes(e.code)) e.preventDefault(); };
    const ku=e=>{ state.keys[e.code]=false; };
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);

    const cv=canvasRef.current; const ctx=cv.getContext('2d');
    function resize(){
      const w = Math.max(window.innerWidth, document.documentElement.clientWidth || 0);
      const h = Math.max(window.innerHeight, document.documentElement.clientHeight || 0);
      const ratio=window.devicePixelRatio||1;
      cv.width=Math.floor(w*ratio); cv.height=Math.floor(h*ratio);
      cv.style.width=w+'px'; cv.style.height=h+'px';
      ctx.imageSmoothingEnabled=false;
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    let frames=0, t0=performance.now();
    function loop(){
      const st=gameRef.current; if(!st) return;
      const now=performance.now(); const dt=Math.min(0.033,(now-st.last)/1000); st.last=now;
      if(running){ update(st,dt,setHud); render(st,ctx,cv,false); } else { render(st,ctx,cv,true); }
      frames++; if(now-t0>500){ setFps(Math.round(frames*1000/(now-t0))); frames=0; t0=now; }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const detach = attachTouchControls(overlayRef.current, state);
    // expose fire for touch tap-to-fire
    state.tryShootFn = ()=>{ try{ tryShoot(state, setHud); }catch{} };

    return ()=>{
      window.removeEventListener('keydown',kd);
      window.removeEventListener('keyup',ku);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      detach();
      gameRef.current=null;
    };
  }, [running]);

  useEffect(()=>{
    const onKey=(e)=>{ const st=gameRef.current; if(!st) return;
      if(e.code==='Space'){ e.preventDefault(); tryShoot(st,setHud); }
      if(e.code==='KeyR'){ e.preventDefault(); reload(st,setHud); }
      if(e.code==='ArrowUp'){ st.player.pitch = clamp(st.player.pitch + 0.02, -PITCH_LIMIT, PITCH_LIMIT); }
      if(e.code==='ArrowDown'){ st.player.pitch = clamp(st.player.pitch - 0.02, -PITCH_LIMIT, PITCH_LIMIT); }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  }, []);

  const buttonsBottom = 4 + CONTROL_DIAMETER + 20;

  return (
    <>
      <div className="fixed inset-0 bg-black">
        <canvas ref={canvasRef} className="block w-screen h-screen"/>
        <div ref={overlayRef} className="absolute inset-0 select-none">

          {/* HUD */}
          <div className="absolute top-3 left-16 right-3 flex items-center justify-between text-white text-sm md:text-base z-20">
            <div className="flex gap-3 bg-black/60 rounded-full px-4 py-2">
              <span>HP: {hud.hp}</span>
              <span>Ammo: {hud.ammo}</span>
              <span>Score: {hud.score}</span>
            </div>
            <div className="bg-black/60 rounded-full px-4 py-2">{fps} FPS</div>
          </div>
          {hud.msg && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm z-20">
              {hud.msg}
            </div>
          )}

          {/* FIRE/RELOAD */}
          <div className="absolute right-4 z-20" style={{ bottom: `${buttonsBottom}px` }}>
            <div className="flex gap-3">
              <CircleButton label="FIRE" onClick={(e)=>{ e.stopPropagation(); tryShoot(gameRef.current,setHud); }} size={64} strong/>
              <CircleButton label="RELOAD" onClick={(e)=>{ e.stopPropagation(); reload(gameRef.current,setHud); }} size={64}/>
            </div>
          </div>

          {/* Extra FIRE linksboven MOVE */}
          <div className="absolute left-4 z-20" style={{ bottom: `${buttonsBottom}px` }}>
            <div className="flex">
              <CircleButton label="FIRE" onClick={(e)=>{ e.stopPropagation(); tryShoot(gameRef.current,setHud); }} size={64} strong/>
            </div>
          </div>

          {/* Pause */}
          <div className="absolute top-3 left-3 z-30">
            <CircleButton label={running? 'II' : '▶'} onClick={()=>setRunning(r=>!r)} size={56}/>
          </div>

          {/* Ghost pads */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-10">
            <RoundGhost diameter={CONTROL_DIAMETER} label={'MOVE'}/>
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 z-10">
            <RoundGhost diameter={CONTROL_DIAMETER} label={'LOOK'}/>
          </div>

          {/* Minimap */}
          <RoundMiniMap gameRef={gameRef} size={96}/>

          {/* Crosshair */}
          <div className="absolute inset-0 pointer-events-none z-20" style={{ transform: (Math.hypot(gameRef.current?.moveVec.x||0, gameRef.current?.moveVec.y||0)>0.001) ? `translate3d(${Math.sin((gameRef.current?.last||0)*0.018)*2}px, ${Math.cos((gameRef.current?.last||0)*0.022)*2}px, 0)` : undefined }}>
            <Crosshair40 />
          </div>
        </div>
      </div>
    </>
  );
}

if (import.meta && import.meta.env && import.meta.env.DEV) {
  // Lightweight sanity checks
  console.assert(typeof clamp === 'function', 'utils clamp missing');
  console.assert(typeof render === 'function', 'render missing');
  console.assert(typeof update === 'function', 'update missing');
}