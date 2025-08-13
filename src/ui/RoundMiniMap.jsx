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
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
      if(!st.outside){
        const scale=W/(MAP_W);
        for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++){
          const t=baseMap[idx(x,y)];
          if(t){ ctx.fillStyle = (t===2? 'rgba(200,255,200,0.8)' : 'rgba(255,255,255,0.15)'); ctx.fillRect(x*scale,y*scale,scale,scale); }
        }
        const p=st.player; ctx.fillStyle='rgba(0,200,255,1)'; ctx.beginPath(); ctx.arc(p.x*scale, p.y*scale, 2.2, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(0,200,255,1)'; ctx.beginPath(); ctx.moveTo(p.x*scale, p.y*scale); ctx.lineTo((p.x+Math.cos(p.dir)*0.8)*scale, (p.y+Math.sin(p.dir)*0.8)*scale); ctx.stroke();
      } else {
        // outside: draw a white circle showing movement bounds, center on doorBack
        const centerX = st.outsideCenter?.x ?? MAP_W/2;
        const centerY = st.outsideCenter?.y ?? MAP_H/2;
        const radius = st.outsideRadius ?? Math.min(MAP_W, MAP_H)*0.9;
        // fit circle into minimap box with margins
        const margin = 4;
        const scale = Math.min((W-2*margin)/(radius*2), (H-2*margin)/(radius*2));
        const cx = W/2 + (centerX - centerX)*scale; // center map on circle center
        const cy = H/2 + (centerY - centerY)*scale;
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(cx, cy, radius*scale, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;
        // monoliths
        const mons = st.outsideMonoliths || [];
        ctx.fillStyle='rgba(255,255,255,0.9)';
        for(const m of mons){
          const mx = cx + Math.cos(m.angle) * (m.r * scale);
          const my = cy + Math.sin(m.angle) * (m.r * scale);
          ctx.beginPath(); ctx.ellipse(mx, my, 2.2, 2.2*0.6, 0, 0, Math.PI*2); ctx.fill();
        }
        // player
        const p=st.player; const px = cx + (p.x - centerX)*scale; const py = cy + (p.y - centerY)*scale;
        ctx.fillStyle='rgba(0,200,255,1)'; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(0,200,255,1)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(p.dir)*8, py + Math.sin(p.dir)*8); ctx.stroke();
      }
      raf=requestAnimationFrame(draw);
    }
    raf=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(raf);
  }, [gameRef, size]);

  return (
    <div className="absolute top-3 right-3 bg-black/40 border border-white/15 z-20" style={{ width:size, height:size }}>
      <canvas ref={ref} style={{ width: size, height: size }} />
    </div>
  );
}