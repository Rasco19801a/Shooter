export function projectBillboard(p, screenW, x, y){
  const dx=x-p.x, dy=y-p.y; const dist=Math.hypot(dx,dy); if(dist<0.05) return null;
  const ang=Math.atan2(dy,dx)-p.dir;
  const a=((ang+Math.PI)%(2*Math.PI))-Math.PI;
  if(Math.abs(a)>p.fov) return null;
  const s = Math.min(9999, (1/(dist+0.0001)) * (screenW*0.9));
  const screenX = (0.5 + (a/p.fov)) * screenW;
  return { z:dist, x:screenX, s };
}