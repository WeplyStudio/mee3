import React, { useEffect, useRef, useState } from 'react';

interface ShutterRevealImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  delay?: number;
  duration?: number;
  fetchPriority?: 'high' | 'low' | 'auto';
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * ShutterRevealImage
 * Renders the image cleanly inside its frame without clipping the IntersectionObserver box,
 * so images inside ScrollReveal sections are always visible when the section reveals.
 */
export const ShutterRevealImage: React.FC<ShutterRevealImageProps> = ({
  src,
  srcSet,
  sizes,
  alt = '',
  className = '',
  imgClassName = 'w-full h-full object-cover',
  fetchPriority,
  loading = 'lazy',
  decoding = 'async',
  onClick,
  children,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
    >
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        className={imgClassName}
      />
      {children}
    </div>
  );
};

interface ShutterRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  onClick?: () => void;
}

export const ShutterReveal: React.FC<ShutterRevealProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 1.05,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const extraDelayMs = delay < 10 ? delay * 1000 : delay;
  const durationMs = duration < 10 ? duration * 1000 : duration;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      setIsVisible(true);
      return;
    }

    let revealTimer: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            if (revealTimer === null) {
              revealTimer = window.setTimeout(() => {
                setIsVisible(true);
              }, 1000);
            }
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: 0.05,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (revealTimer !== null) {
        window.clearTimeout(revealTimer);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="w-full h-full"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, 24px, 0)',
          transitionProperty: 'transform, opacity',
          transitionDuration: `${durationMs}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDelay: `${Math.min(extraDelayMs, 250)}ms`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
