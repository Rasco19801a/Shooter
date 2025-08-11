export function drawCube3D(ctx, cx, cy, size, t, color){
  const s=size/2; const verts=[
    [-s,-s,-s],[ s,-s,-s],[ s, s,-s],[-s, s,-s],
    [-s,-s, s],[ s,-s, s],[ s, s, s],[-s, s, s],
  ];
  const sy=Math.sin(t), cy_=Math.cos(t);
  const sp=Math.sin(t*0.6), cp=Math.cos(t*0.6);
  const sr=Math.sin(t*0.3), cr=Math.cos(t*0.3);
  function rot(v){
    let [x,y,z]=v;
    let x1 =  x*cy_ - y*sy; let y1 = x*sy + y*cy_; let z1 = z;
    let y2 =  y1*cp - z1*sp; let z2 = y1*sp + z1*cp; let x2 = x1;
    let z3 =  z2*cr - x2*sr; let x3 = z2*sr + x2*cr; let y3 = y2;
    return [x3,y3,z3];
  }
  const v = verts.map(rot).map(([x,y])=>[x+cx, y+cy]);
  const faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,3,7,4]];
  let base=200;
  if(typeof color==='string' && color.startsWith('rgb(')){
    const inside = color.slice(4, -1); const parts = inside.split(','); const r = parseInt(parts[0],10); if(!Number.isNaN(r)) base = r;
  }
  const mul=[0.70,1.00,0.85,0.85,0.90,0.90];
  for(let i=0;i<faces.length;i++){
    const f=faces[i]; const g=Math.max(0,Math.min(255,Math.floor(base*mul[i])));
    ctx.beginPath(); ctx.moveTo(v[f[0]][0], v[f[0]][1]);
    for(let k=1;k<f.length;k++) ctx.lineTo(v[f[k]][0], v[f[k]][1]);
    ctx.closePath(); ctx.fillStyle=`rgb(${g},${g},${g})`; ctx.fill();
  }
}

export function drawRectPrism3D(ctx, cx, cy, w, h, d, yaw, pitch, roll, color){
  const hw=w/2, hh=h/2, hd=d/2;
  const verts=[
    [-hw,-hh,-hd],[ hw,-hh,-hd],[ hw, hh,-hd],[-hw, hh,-hd],
    [-hw,-hh, hd],[ hw,-hh, hd],[ hw, hh, hd],[-hw, hh, hd],
  ];
  const sy=Math.sin(yaw), cy_=Math.cos(yaw);
  const sp=Math.sin(pitch), cp=Math.cos(pitch);
  const sr=Math.sin(roll), cr=Math.cos(roll);
  function rot(v){
    let [x,y,z]=v;
    let x1 =  x*cy_ - y*sy; let y1 = x*sy + y*cy_; let z1 = z;
    let y2 =  y1*cp - z1*sp; let z2 = y1*sp + z1*cp; let x2 = x1;
    let z3 =  z2*cr - x2*sr; let x3 = z2*sr + x2*cr; let y3 = y2;
    return [x3,y3,z3];
  }
  const v3 = verts.map(rot);
  const v = v3.map(([x,y])=>[x+cx, y+cy]);
  const faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,3,7,4]];
  let base=200;
  if(typeof color==='string' && color.startsWith('rgb(')){
    const inside = color.slice(4, -1); const parts = inside.split(','); const r = parseInt(parts[0],10); if(!Number.isNaN(r)) base = r;
  }
  const mul=[0.70,1.00,0.85,0.85,0.90,0.90];
  for(let i=0;i<faces.length;i++){
    const f=faces[i]; const g=Math.max(0,Math.min(255,Math.floor(base*mul[i])));
    ctx.beginPath(); ctx.moveTo(v[f[0]][0], v[f[0]][1]);
    for(let k=1;k<f.length;k++) ctx.lineTo(v[f[k]][0], v[f[k]][1]);
    ctx.closePath(); ctx.fillStyle=`rgb(${g},${g},${g})`; ctx.fill();
  }
  // return front face center for muzzle tip
  const fx = (v[4][0]+v[5][0]+v[6][0]+v[7][0]) / 4;
  const fy = (v[4][1]+v[5][1]+v[6][1]+v[7][1]) / 4;
  return { frontX: fx, frontY: fy };
}