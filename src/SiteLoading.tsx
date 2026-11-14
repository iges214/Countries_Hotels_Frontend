import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useHotel } from "./context";
import { requestActivity } from "./requestActivity";

export function SiteLoading({ children }: { children: ReactNode }) {
  const { loading } = useHotel();
  const pending = useSyncExternalStore(requestActivity.subscribe, requestActivity.getSnapshot);
  const busy = pending > 0;
  const [initializing, setInitializing] = useState(true);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    if (!loading) setInitializing(false);
  }, [loading]);

  useEffect(() => {
    if (!busy) {
      setShowActivity(false);
      return;
    }
    const timer = setTimeout(() => setShowActivity(true), 200);
    return () => clearTimeout(timer);
  }, [busy]);

  return (
    <>
      {initializing && (
        <div className="site-loader" role="status" aria-live="polite">
          <div className="site-loader__mark" aria-hidden="true">I</div>
          <p className="site-loader__brand">IGES Hotel &amp; Suites</p>
          <p className="site-loader__message">Preparing your stay…</p>
        </div>
      )}
      <div className="site-content" inert={initializing} aria-busy={initializing || busy}>
        {children}
      </div>
      <div className="request-loader" role="status" aria-live="polite">
        {!initializing && showActivity && busy && (
          <div className="request-loader__pill">
            <span className="loading-spinner" aria-hidden="true" />
            Loading hotel information…
          </div>
        )}
      </div>
    </>
  );
}
