import React, { useEffect, useState, useRef, useCallback } from 'react';

interface AnimatedCounterProps {
  value: string;
  duration?: number;
  delay?: number;
  triggerReplay?: boolean;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1400,
  delay = 0,
  triggerReplay = false,
  className = '',
}: AnimatedCounterProps) {
  // Check if string contains leading zeros (e.g., '05')
  const isPadded = value.startsWith('0') && value.length > 1;
  const targetNum = parseInt(value, 10);
  const isNumeric = !isNaN(targetNum);

  const initialDisplay = isNumeric
    ? isPadded
      ? '0'.repeat(value.length)
      : '0'
    : value;

  const [displayValue, setDisplayValue] = useState<string>(initialDisplay);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const isAnimatingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  const runAnimation = useCallback(
    (animDuration: number = duration) => {
      if (!isNumeric) {
        setDisplayValue(value);
        return;
      }

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      isAnimatingRef.current = true;
      const startTime = performance.now();
      const startVal = 0;

      const tick = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animDuration, 1);

        // Smooth easeOutExpo formula for silky deceleration
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = Math.round(startVal + (targetNum - startVal) * ease);

        let formatted = current.toString();
        if (isPadded) {
          formatted = formatted.padStart(value.length, '0');
        }
        setDisplayValue(formatted);

        if (progress < 1) {
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          setDisplayValue(value);
          isAnimatingRef.current = false;
        }
      };

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [value, targetNum, isNumeric, isPadded, duration]
  );

  // IntersectionObserver to trigger animation when scrolled into viewport
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          const timer = setTimeout(() => {
            runAnimation(duration);
          }, delay);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [hasStarted, delay, duration, runAnimation]);

  // Re-run if value changes (e.g. language or prop change)
  useEffect(() => {
    if (hasStarted) {
      runAnimation(duration * 0.8);
    }
  }, [value]);

  // Handle external replay trigger (e.g. card hover)
  useEffect(() => {
    if (triggerReplay && hasStarted && !isAnimatingRef.current) {
      runAnimation(450); // Snappy replay on hover
    }
  }, [triggerReplay, hasStarted, runAnimation]);

  return (
    <span
      ref={elementRef}
      aria-label={value}
      className={`tabular-nums font-mono-code select-none inline-block ${className}`}
    >
      {displayValue}
    </span>
  );
}
