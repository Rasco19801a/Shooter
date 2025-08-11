import { PITCH_LIMIT } from './constants.js';
import { visible } from './utils.js';

export function normalizeAngle(a){ let x = ((a + Math.PI) % (2*Math.PI)); if (x < 0) x += 2*Math.PI; return x - Math.PI; }
export function lerpAngles(a, b, t){ const d = normalizeAngle(b - a); return a + d * t; }

export function computeAimAssistDirection(state, baseDir){
  const p = state.player;
  const maxAim = 8 * Math.PI / 180;
  const maxDist = 9.0;
  let best = null;
  for(const e of state.enemies){
    if(!e.alive) continue;
    const dx = e.x - p.x, dy = e.y - p.y; const dist = Math.hypot(dx,dy);
    if(dist > maxDist) continue;
    if(!visible(p.x,p.y,e.x,e.y)) continue;
    const ang = Math.atan2(dy,dx);
    const diff = Math.abs(normalizeAngle(ang - baseDir));
    if(diff > maxAim) continue;
    if(!best || diff < best.diff){ best = { ang, diff, dist }; }
  }
  if(!best) return baseDir;
  const closeness = 1 - best.diff / maxAim;
  const distanceFactor = Math.max(0, Math.min(1, 1 - best.dist / maxDist));
  const strength = 0.6 * closeness * (0.5 + 0.5*distanceFactor);
  return lerpAngles(baseDir, best.ang, strength);
}

export function spawnProjectile(state, x, y, dir, spd, ttl, from, type, z0 = (from==='player'?0.35:0.50), pitch = 0){
  const spread = 0;
  const cosP = Math.cos(pitch);
  const dx = Math.cos(dir+spread) * cosP;
  const dy = Math.sin(dir+spread) * cosP;
  const vz = Math.sin(pitch) * spd;
  const pr = { x: x + Math.cos(dir)*0.2, y: y + Math.sin(dir)*0.2, dx, dy, spd, ttl, from, type, z: z0, vz };
  if(type==='laser'){ pr.trail=[]; }
  state.projectiles.push(pr);
}

export function tryShoot(state, setHud){
  if(!state||state.won) return;
  if(state.reloadTime>0||state.shootCooldown>0) return;
  setHud(h=>{ if(h.ammo<=0) return {...h, msg:'Click! (Leeg)'}; return {...h, ammo:h.ammo-1, msg:'Bang!'}; });
  state.shootCooldown=0.12;
  const p=state.player;
  const aimDir = computeAimAssistDirection(state, p.dir);
  const bulletPitch = p.pitch;
  // Spawn visible projectile towards crosshair
  spawnProjectile(state, p.x, p.y, aimDir, 12.0, 1.4, 'player', 'bullet', 0.35, bulletPitch);

}

export function reload(state,setHud){
  if(!state) return;
  if(state.reloadTime>0) return;
  setHud(h=>({...h, msg:'Reloading…'}));
  state.reloadTime=0.9;
  setTimeout(()=>{ setHud(h=>({...h, ammo:6, msg:''})); state.reloadTime=0; }, 900);
}