import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const base = import.meta.env.BASE_URL || "/";
      navigator.serviceWorker.register(base + "sw.js").catch(() => {
        // SW registration failed - silent, non-critical
      });
    }
  }, []);

  return null;
}
