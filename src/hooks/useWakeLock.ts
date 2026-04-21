import { useEffect, useRef } from "react";

export function useWakeLock(): void {
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    async function request(): Promise<void> {
      try {
        wakeLock.current = await navigator.wakeLock.request("screen");
      } catch {
        // Battery saver or permission denied - ignore
      }
    }

    request();

    function onVisibilityChange(): void {
      if (document.visibilityState === "visible") {
        request();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wakeLock.current?.release().catch(() => {});
    };
  }, []);
}
