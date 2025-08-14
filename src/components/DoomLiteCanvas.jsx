import React, { useEffect, useRef, useState } from "react";
import { CONTROL_DIAMETER, FOV, PITCH_LIMIT } from "../game/constants.js";
import { clamp } from "../game/utils.js";
import { initState, update } from "../game/update.js";
import { render } from "../game/render.js";
import { attachTouchControls } from "../controls/touchControls.js";
import RoundGhost from "../ui/RoundGhost.jsx";
import RoundMiniMap from "../ui/RoundMiniMap.jsx";

export default function DoomLiteCanvas(){
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [running,setRunning] = useState(true);
  const [fps,setFps] = useState(0);
  const gameRef = useRef(null);
  const commit = (typeof __COMMIT_HASH__ !== 'undefined') ? __COMMIT_HASH__ : 'dev';

  useEffect(()=>{
    const state = initState();
    state.player.fov = FOV;
    gameRef.current = state;

    const kd=e=>{ state.keys[e.code]=true; if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"].includes(e.code)) e.preventDefault(); };
    const ku=e=>{ state.keys[e.code]=false; };
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);

    const cv=canvasRef.current; const ctx=cv.getContext('2d');
    // Offscreen buffer for simple SSAA
    const offscreen = document.createElement('canvas');
    const octx = offscreen.getContext('2d');
    let scaleFactor = 1.0; // 1.0=no AA
    function resize(){
      const w = Math.max(window.innerWidth, document.documentElement.clientWidth || 0);
      const h = Math.max(window.innerHeight, document.documentElement.clientHeight || 0);
      const ratio=window.devicePixelRatio||1;
      cv.width=Math.floor(w*ratio); cv.height=Math.floor(h*ratio);
      cv.style.width=w+'px'; cv.style.height=h+'px';
      // Configure offscreen at a higher resolution
      offscreen.width = Math.floor(cv.width * scaleFactor);
      offscreen.height = Math.floor(cv.height * scaleFactor);
      octx.imageSmoothingEnabled = false;
      // Disable smoothing when drawing back to screen
      ctx.imageSmoothingEnabled = false;
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    // Pointer lock for desktop mouse look
    const mouseSensitivityX = 0.0025;
    const mouseSensitivityY = 0.0015;
    const onMouseMove = (e)=>{
      const st=gameRef.current; if(!st) return;
      if(document.pointerLockElement === cv){
        st.player.dir += e.movementX * mouseSensitivityX;
        st.player.pitch = clamp(st.player.pitch - e.movementY * mouseSensitivityY, -PITCH_LIMIT, PITCH_LIMIT);
      }
    };
    const onClickCanvas = ()=>{
      if(document.pointerLockElement !== cv){
        cv.requestPointerLock?.();
      }
    };
    cv.addEventListener('click', onClickCanvas);
    document.addEventListener('mousemove', onMouseMove);

    // Toggle keys for overlays
    const onToggleKeys = (e)=>{
      const st=gameRef.current; if(!st) return;
    };
    window.addEventListener('keydown', onToggleKeys);

    let frames=0, t0=performance.now();
    function loop(){
      const st=gameRef.current; if(!st) return;
      const now=performance.now(); const dt=Math.min(0.033,(now-st.last)/1000); st.last=now;
      if(running){
        // Render to offscreen at higher resolution
        update(st,dt);
        render(st, octx, offscreen, false);
        // Blit down with smoothing
        ctx.clearRect(0,0,cv.width,cv.height);
        ctx.drawImage(offscreen, 0, 0, offscreen.width, offscreen.height, 0, 0, cv.width, cv.height);
      } else {
        render(st, octx, offscreen, true);
        ctx.clearRect(0,0,cv.width,cv.height);
        ctx.drawImage(offscreen, 0, 0, offscreen.width, offscreen.height, 0, 0, cv.width, cv.height);
      }
      frames++; if(now-t0>500){ setFps(Math.round(frames*1000/(now-t0))); frames=0; t0=now; }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const detach = attachTouchControls(overlayRef.current, state);

    return ()=>{
      window.removeEventListener('keydown',kd);
      window.removeEventListener('keyup',ku);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      document.removeEventListener('mousemove', onMouseMove);
      try{ canvasRef.current && canvasRef.current.removeEventListener('click', onClickCanvas); }catch{}
      window.removeEventListener('keydown', onToggleKeys);
      detach();
      gameRef.current=null;
    };
  }, [running]);

  useEffect(()=>{
    const onKey=(e)=>{ const st=gameRef.current; if(!st) return;
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

          {/* Top status */}
          <div className="absolute top-3 left-3 flex items-center justify-start text-white text-sm md:text-base z-20">
            <div className="flex items-center gap-2">
              <div className="bg-black/60 rounded-full px-4 py-2">{fps} FPS</div>
              <div className="bg-black/60 rounded-full px-3 py-2 text-xs" title="Git commit">
                {commit}
              </div>
            </div>
          </div>

          {/* Ghost pads */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-10">
            <RoundGhost diameter={CONTROL_DIAMETER/2} label={'MOVE'}/>
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 z-10">
            <RoundGhost diameter={CONTROL_DIAMETER/2} label={'LOOK'}/>
          </div>

          {/* Minimap */}
          <RoundMiniMap gameRef={gameRef} size={96}/>
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