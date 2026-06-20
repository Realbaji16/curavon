import { useContext } from 'react';
import { HealthContext } from './HealthContext';

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error('useHealth must be used within HealthProvider');
  return ctx;
}
