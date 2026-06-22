"use client";

import { useEffect, useState } from "react";

/**
 * Slim top progress bar shown while the dashboard refreshes. Fills 0→100%
 * over `durationMs` (default 1s), then fades out when loading completes.
 */
export function LoadingBar({
  active,
  durationMs = 1000,
}: {
  active: boolean;
  durationMs?: number;
}) {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setWidth(0);
      const raf = requestAnimationFrame(() => setWidth(100));
      return () => cancelAnimationFrame(raf);
    }
    if (visible) {
      setWidth(100);
      const t = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5">
      <div
        className="h-full bg-blue-mid ease-out"
        style={{
          width: `${width}%`,
          transitionProperty: "width, opacity",
          transitionDuration: `${durationMs}ms`,
          opacity: active ? 1 : 0,
        }}
      />
    </div>
  );
}
