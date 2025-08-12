import React, { useEffect, useRef, useState } from "react";
import { FOV, PITCH_LIMIT, CONTROL_DIAMETER } from "../game/constants.js";
import { clamp } from "../game/utils.js";
import { render } from "../game/render.js";
import { spawnEnemies } from "../game/enemies.js";
import { update } from "../game/update.js";
import { tryShoot, reload } from "../game/combat.js";
import { attachTouchControls } from "../controls/touch.js";

import CircleButton from "../ui/components/CircleButton.jsx";
import RoundGhost from "../ui/components/RoundGhost.jsx";
import RoundMiniMap from "../ui/components/RoundMiniMap.jsx";
import Crosshair40 from "../ui/components/Crosshair40.jsx";
import HUD from "../ui/components/HUD.jsx";

export default function DoomLiteCanvas(){
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [running,setRunning] = useState(true);
  const [hud,setHud] = useState({ hp:100, ammo:6, score:0, msg:"" });
  const [fps,setFps] = useState(0);
  const gameRef = useRef(null);

  useEffect(()=>{
    const state = {
      player: { x:2.5, y:2.5, dir:0, pitch:0, fov:FOV, speed:2.6 },
      enemies: spawnEnemies(9),
      projectiles: [],
      particles: [],
      last: performance.now(),
      keys:{},
      moveVec:{x:0,y:0},
      turnStickX:0,
      turnStickY:0,
      shootCooldown:0,
      reloadTime:0,
      won:false,
    };
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

          <HUD hud={hud} fps={fps} />

          <div className="absolute right-4 z-20" style={{ bottom: `${buttonsBottom}px` }}>
            <div className="flex gap-3">
              <CircleButton label="FIRE" onClick={()=>tryShoot(gameRef.current,setHud)} size={64} strong/>
              <CircleButton label="RELOAD" onClick={()=>reload(gameRef.current,setHud)} size={64}/>
            </div>
          </div>

          <div className="absolute left-4 z-20" style={{ bottom: `${buttonsBottom}px` }}>
            <div className="flex">
              <CircleButton label="FIRE" onClick={()=>tryShoot(gameRef.current,setHud)} size={64} strong/>
            </div>
          </div>

          <div className="absolute top-3 left-3 z-30">
            <CircleButton label={running? 'II' : '▶'} onClick={()=>setRunning(r=>!r)} size={56}/>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 z-10">
            <RoundGhost label={'MOVE'}/>
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 z-10">
            <RoundGhost label={'LOOK'}/>
          </div>

          <RoundMiniMap gameRef={gameRef} size={96}/>

          <div className="absolute inset-0 pointer-events-none z-20">
            <Crosshair40 />
          </div>
        </div>
      </div>
    </>
  );
}

if (import.meta && import.meta.env && import.meta.env.DEV) {
  (function runSelfTests(){
    console.assert(clamp(2,0,1)===1, 'clamp high bound failed');
    console.assert(clamp(-1,0,1)===0, 'clamp low bound failed');
    console.assert(clamp(0.5,0,1)===0.5, 'clamp mid failed');
  })();
}