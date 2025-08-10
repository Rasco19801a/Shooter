import React, { useEffect, useRef } from 'react';
import { MAP_W, MAP_H, baseMap } from '../game/constants.js';
import { idx } from '../game/utils.js';

export default function RoundMiniMap({ gameRef, size=96 }){
  const ref=useRef(null);
  useEffect(()=>{ let raf;
    function draw(){
      const cv=ref.current; if(!cv){ raf=requestAnimationFrame(draw); return; }
      const ctx=cv.getContext('2d'); const st=gameRef.current; if(!st){ raf=requestAnimationFrame(draw); return; }
      const W=size, H=size; cv.width=W; cv.height=H; ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,W,H);
      const scale=W/(MAP_W);
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
      for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++){
        const t=baseMap[idx(x,y)];
        if(t){ ctx.fillStyle = (t===2? 'rgba(200,255,200,0.8)' : 'rgba(255,255,255,0.15)'); ctx.fillRect(x*scale,y*scale,scale,scale); }
      }
      ctx.fillStyle='rgba(255,255,255,0.9)';
      for(const e of st.enemies){ if(!e.alive) continue; ctx.beginPath(); ctx.arc(e.x*scale, e.y*scale, 1.6, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle='rgba(255,255,255,0.9)';
      for(const pr of st.projectiles){ ctx.beginPath(); ctx.arc(pr.x*scale, pr.y*scale, 1.1, 0, Math.PI*2); ctx.fill(); }
      const p=st.player; ctx.fillStyle='rgba(0,200,255,1)'; ctx.beginPath(); ctx.arc(p.x*scale, p.y*scale, 2.2, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(0,200,255,1)'; ctx.beginPath(); ctx.moveTo(p.x*scale, p.y*scale); ctx.lineTo((p.x+Math.cos(p.dir)*0.8)*scale, (p.y+Math.sin(p.dir)*0.8)*scale); ctx.stroke();
      raf=requestAnimationFrame(draw);
    }
    raf=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(raf);
  }, [gameRef, size]);

  return (
    <div className="absolute top-3 right-3 p-1 rounded-full bg-black/40 border border-white/15 overflow-hidden z-20" style={{ width:size+8, height:size+8 }}>
      <canvas ref={ref} style={{ width: size, height: size }} />
    </div>
  );
}