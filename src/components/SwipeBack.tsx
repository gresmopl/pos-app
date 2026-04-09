import { useEffect } from "react";
import { useNavigate } from "react-router";

export function SwipeBack() {
  const navigate = useNavigate();

  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);

      // Swipe from left edge (start < 30px), horizontal > 80px, not too vertical
      if (startX < 30 && dx > 80 && dy < 100) {
        navigate(-1);
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate]);

  return null;
}
