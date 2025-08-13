import React from 'react';
import { CONTROL_DIAMETER } from '../game/constants.js';

export default function RoundGhost({ diameter=CONTROL_DIAMETER, label }){
  const safe = label == null ? '' : label;
  return (
    <div style={{ width: diameter, height: diameter }} className="rounded-full border border-white/10 bg-black/40 flex items-center justify-center text-[10px] text-white/80 select-none">{safe}</div>
  );
}