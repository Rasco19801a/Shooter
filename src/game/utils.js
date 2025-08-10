export function clamp(v, a, b){
  return Math.max(a, Math.min(b, v));
}

export function normalizeAngle(a){
  let x = ((a + Math.PI) % (2*Math.PI));
  if (x < 0) x += 2*Math.PI;
  return x - Math.PI;
}

export function lerpAngles(a, b, t){
  const d = normalizeAngle(b - a);
  return a + d * t;
}