import { clamp, normalizeAngle, lerpAngles } from '../game/utils.js';

export function runUtilsDevTests(){
  console.assert(clamp(2,0,1)===1, 'clamp high bound failed');
  console.assert(clamp(-1,0,1)===0, 'clamp low bound failed');
  console.assert(clamp(0.5,0,1)===0.5, 'clamp mid failed');

  const a = Math.PI - 0.1, b = -Math.PI + 0.1;
  const mid = lerpAngles(a, b, 0.5);
  console.assert(Math.abs(normalizeAngle(mid)) < 0.5, 'lerpAngles across wrap should be near 0');
}

if (import.meta && import.meta.env && import.meta.env.DEV){
  runUtilsDevTests();
}