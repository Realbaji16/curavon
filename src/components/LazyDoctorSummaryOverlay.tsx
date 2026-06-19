import { lazy, Suspense } from 'react';
import { useApp } from '../context/useApp';
import { RouteLoadingFallback } from './RouteLoadingFallback';

const DoctorSummaryOverlay = lazy(() =>
  import('./DoctorSummaryOverlay').then((module) => ({
    default: module.DoctorSummaryOverlay,
  })),
);

export function LazyDoctorSummaryOverlay() {
  const { showDoctorSummary } = useApp();
  if (!showDoctorSummary) return null;

  return (
    <Suspense fallback={<RouteLoadingFallback message="Getting this ready…" />}>
      <DoctorSummaryOverlay />
    </Suspense>
  );
}
