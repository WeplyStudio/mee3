import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook to track scroll progress across a target element
 * returns progress between 0 and 1 as the element travels up the viewport
 */
export function useScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const calculateProgress = () => {
      ticking = false;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || 800;

      // Calculate relative position: 0 when element enters from bottom, 1 when element reaches middle-top
      const start = windowHeight * 0.95;
      const end = windowHeight * 0.25;
      const denominator = start - end;

      if (!denominator || Number.isNaN(denominator)) {
        setProgress(0);
        return;
      }

      const current = rect.top;
      const rawProgress = (start - current) / denominator;
      const clamped = Number.isNaN(rawProgress) ? 0 : Math.max(0, Math.min(1, rawProgress));

      setProgress(clamped);
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(calculateProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return { ref, progress };
}

