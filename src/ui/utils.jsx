import React from 'react';

export function coerceLabel(label, fallback){
  if (label == null) return fallback;
  if (typeof label === 'string' || typeof label === 'number') return label;
  if (React.isValidElement(label)) return label;
  return fallback;
}