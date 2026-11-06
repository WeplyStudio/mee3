import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Additional optional delay in milliseconds
  distance?: number; // Slide-up distance in px
}

const ScrollRevealSectionContext = createContext<boolean>(false);

export const ScrollReveal: React.FC<Props> = ({
  children,
  className = '',
  delay = 0,
  distance = 32,
}) => {
  const isInsideRevealedSection = useContext(ScrollRevealSectionContext);
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasFinishedTransition, setHasFinishedTransition] = useState(false);

  const safeDistance = typeof distance === 'number' && !Number.isNaN(distance) ? distance : 32;

  useEffect(() => {
    if (isInsideRevealedSection) return;

    const el = ref.current;
    if (!el) {
      setIsVisible(true);
      setHasFinishedTransition(true);
      return;
    }

    let delayTimer: number | null = null;
    let finishTimer: number | null = null;

    const triggerWithOneSecondDelay = () => {
      if (delayTimer !== null) return;
      delayTimer = window.setTimeout(() => {
        setIsVisible(true);
        finishTimer = window.setTimeout(() => {
          setHasFinishedTransition(true);
        }, 950);
      }, 1000);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          triggerWithOneSecondDelay();
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px',
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (delayTimer !== null) {
        window.clearTimeout(delayTimer);
      }
      if (finishTimer !== null) {
        window.clearTimeout(finishTimer);
      }
    };
  }, [isInsideRevealedSection]);

  // If nested inside a parent section's ScrollReveal, let the parent section animate as one unified unit
  if (isInsideRevealedSection) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  return (
    <ScrollRevealSectionContext.Provider value={true}>
      <div
        ref={ref}
        className={className}
        style={
          hasFinishedTransition
            ? {
                opacity: 1,
                transform: 'none',
              }
            : {
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translate3d(0, 0, 0)' : `translate3d(0, ${safeDistance}px, 0)`,
                transition: 'opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: delay > 0 ? `${Math.min(delay, 200)}ms` : '0ms',
                willChange: 'transform, opacity',
              }
        }
      >
        {children}
      </div>
    </ScrollRevealSectionContext.Provider>
  );
};
