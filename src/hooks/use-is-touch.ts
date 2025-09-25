import {useEffect, useState} from 'react';

/**
 * Detects whether the current device supports touch interactions.
 * Uses a lazy check so server-side rendering stays deterministic.
 */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectTouch = () =>
      Boolean('ontouchstart' in window || navigator.maxTouchPoints > 0);

    setIsTouch(detectTouch());

    const updateOnFirstTouch = () => {
      setIsTouch(true);
      window.removeEventListener('touchstart', updateOnFirstTouch);
    };

    window.addEventListener('touchstart', updateOnFirstTouch, {once: true});

    return () => {
      window.removeEventListener('touchstart', updateOnFirstTouch);
    };
  }, []);

  return isTouch;
}
