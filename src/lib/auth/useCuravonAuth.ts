import { useContext } from 'react';
import { CuravonAuthContext } from './authContext';

export function useCuravonAuth() {
  const ctx = useContext(CuravonAuthContext);
  if (!ctx) throw new Error('useCuravonAuth must be used within CuravonAuthProvider');
  return ctx;
}
