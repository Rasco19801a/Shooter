import React from 'react';

export default function CircleButton({ label, onClick, size=64, strong=false }){
  const safe = label == null ? '' : label;
  return (
    <button
      onClick={onClick}
      style={{ width:size, height:size }}
      className={`rounded-full text-white border ${strong? 'bg-white/25 border-white/40' : 'bg-white/12 border-white/25'} active:scale-95 flex items-center justify-center text-xs font-semibold`}
    >{safe}</button>
  );
}