import React from 'react';
import CircleButton from './CircleButton.jsx';

export default function Controls({ running, onTogglePause, onFire, onReload, buttonsBottom }){
  return (
    <>
      <div className="absolute right-4 z-20" style={{ bottom: `${buttonsBottom}px` }}>
        <div className="flex gap-3">
          <CircleButton label="FIRE" onClick={onFire} size={64} strong/>
          <CircleButton label="RELOAD" onClick={onReload} size={64}/>
        </div>
      </div>

      <div className="absolute left-4 z-20" style={{ bottom: `${buttonsBottom}px` }}>
        <div className="flex">
          <CircleButton label="FIRE" onClick={onFire} size={64} strong/>
        </div>
      </div>

      <div className="absolute top-3 left-3 z-30">
        <CircleButton label={running? 'II' : '▶'} onClick={onTogglePause} size={56}/>
      </div>
    </>
  );
}