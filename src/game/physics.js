import { isWall } from './utils.js';

// Integrate one particle with gravity, ground bounce and horizontal motion
export function integrateParticle(particle, dt){
  if(particle.dead) return;
  particle.ttl -= dt; if(particle.ttl<=0){ particle.dead=true; return; }

  const noGravity = !!particle.noGravity;
  if(!noGravity){
    particle.vh = (particle.vh ?? 0) - 12.0*dt;
    particle.h  = (particle.h  ?? 0) + particle.vh*dt;
    if(particle.h <= 0){
      particle.h = 0;
      particle.vh = -Math.abs(particle.vh) * 0.18;
      particle.vx = (particle.vx ?? 0) * 0.78;
      particle.vy = (particle.vy ?? 0) * 0.78;
      if (Math.abs(particle.vh) < 0.15) particle.vh = 0;
      if (Math.hypot(particle.vx||0, particle.vy||0) < 0.025) { particle.vx = 0; particle.vy = 0; }
    }
  } else {
    // maintain existing height and slowly reduce velocity for drift
    particle.h = Math.max(0, (particle.h ?? 0));
    const damp = Math.exp(-1.8*dt);
    particle.vx = (particle.vx||0) * damp;
    particle.vy = (particle.vy||0) * damp;
  }

  const nxp = (particle.x ?? 0) + (particle.vx||0)*dt;
  const nyp = (particle.y ?? 0) + (particle.vy||0)*dt;
  if (!isWall(nxp, nyp)) { particle.x = nxp; particle.y = nyp; }
  else { particle.vx = (particle.vx||0) * -0.25; particle.vy = (particle.vy||0) * -0.25; }
}