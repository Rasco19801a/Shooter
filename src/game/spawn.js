import { collide } from './utils.js';

export function trySlide(entity, nx, ny, radius=0.18){
  if(!collide(nx, entity.y, radius)) { entity.x = nx; return true; }
  if(!collide(entity.x, ny, radius)) { entity.y = ny; return true; }
  return false;
}