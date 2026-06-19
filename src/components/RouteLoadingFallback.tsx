interface RouteLoadingFallbackProps {
  message?: string;
}

export function RouteLoadingFallback({
  message = 'Loading Curavon…',
}: RouteLoadingFallbackProps) {
  return (
    <div className="route-loading-shell" aria-busy="true" aria-live="polite">
      <p className="route-loading-text">{message}</p>
    </div>
  );
}
