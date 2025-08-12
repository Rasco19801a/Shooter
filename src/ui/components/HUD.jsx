import React from 'react';

export default function HUD({ hud, fps }){
  return (
    <>
      <div className="absolute top-3 left-16 right-3 flex items-center justify-between text-white text-sm md:text-base z-20">
        <div className="flex gap-3 bg-black/60 rounded-full px-4 py-2">
          <span>HP: {hud.hp}</span>
          <span>Ammo: {hud.ammo}</span>
          <span>Score: {hud.score}</span>
        </div>
        <div className="bg-black/60 rounded-full px-4 py-2">{fps} FPS</div>
      </div>
      {hud.msg && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm z-20">
          {hud.msg}
        </div>
      )}
    </>
  );
}