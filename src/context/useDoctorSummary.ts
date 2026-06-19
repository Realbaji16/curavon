import { useContext } from 'react';
import { DoctorSummaryContext } from './DoctorSummaryContext';

export function useDoctorSummary() {
  const ctx = useContext(DoctorSummaryContext);
  if (!ctx) throw new Error('useDoctorSummary must be used within DoctorSummaryProvider');
  return ctx;
}
