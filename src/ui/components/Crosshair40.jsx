import React from 'react';

export default function Crosshair40(){
  return (
    <svg width={40} height={40} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" viewBox="0 0 40 40">
      <line x1="8" y1="20" x2="32" y2="20" stroke="white" strokeOpacity="0.9" strokeWidth="1.5" />
      <line x1="20" y1="8" x2="20" y2="32" stroke="white" strokeOpacity="0.9" strokeWidth="1.5" />
    </svg>
  );
}