export function spawnExplosion(state, x, y, color){
  const n = 24 + Math.floor(Math.random()*16);
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 2.0 + Math.random()*3.5;
    const h0 = 0.30 + Math.random()*0.35;
    const vh0 = 1.2 + Math.random()*1.3;
    state.particles.push({
      x: x + Math.cos(a)*0.02,
      y: y + Math.sin(a)*0.02,
      vx: Math.cos(a)*sp,
      vy: Math.sin(a)*sp,
      h: h0,
      vh: vh0,
      ttl: 0.9 + Math.random()*0.7,
      size: 0.10 + Math.random()*0.18,
      color,
    });
  }
}