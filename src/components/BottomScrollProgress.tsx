import React, { useEffect, useState } from 'react';

interface BottomScrollProgressProps {
  currentPage?: string;
}

export const BottomScrollProgress: React.FC<BottomScrollProgressProps> = ({ currentPage }) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const updateScrollProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight || 0;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;

      const totalScrollable = scrollHeight - clientHeight;
      if (totalScrollable <= 0) {
        setScrollProgress(0);
        ticking = false;
        return;
      }

      const progress = Math.min(Math.max(scrollTop / totalScrollable, 0), 1);
      setScrollProgress(progress);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollProgress);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Initial update
    updateScrollProgress();

    // Small delay to recalculate after layout renders on page change
    const timeout = setTimeout(updateScrollProgress, 100);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearTimeout(timeout);
    };
  }, [currentPage]);

  return (
    <aside
      aria-hidden="true"
      aria-label="Scroll progress indicator"
      className="fixed bottom-0 left-0 right-0 w-full h-[3.5px] z-50 pointer-events-none bg-black/5"
    >
      <div
        className="h-full bg-black transition-transform duration-75 ease-out will-change-transform origin-left"
        style={{
          transform: `scaleX(${scrollProgress})`,
        }}
      />
    </aside>
  );
};
