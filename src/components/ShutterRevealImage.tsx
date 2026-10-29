import React, { useEffect, useRef, useState } from 'react';

interface ShutterRevealImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  delay?: number; // In milliseconds or seconds (auto-normalized)
  duration?: number; // In seconds (default: 1.05s)
  fetchPriority?: 'high' | 'low' | 'auto';
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * ShutterRevealImage
 * Display opens from bottom to top (inset(100% 0 0 0) -> inset(0 0 0 0))
 * The image itself stays stationary for a pure, elegant curtain wipe reveal.
 */
export const ShutterRevealImage: React.FC<ShutterRevealImageProps> = ({
  src,
  srcSet,
  sizes,
  alt = '',
  className = '',
  imgClassName = 'w-full h-full object-cover',
  delay = 0,
  duration = 1.05,
  fetchPriority,
  loading = 'lazy',
  decoding = 'async',
  onClick,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(fetchPriority === 'high');

  const delayMs = delay < 10 ? delay * 1000 : delay;
  const durationMs = duration < 10 ? duration * 1000 : duration;

  useEffect(() => {
    if (isVisible) return;
    const el = containerRef.current;
    if (!el) {
      setIsVisible(true);
      return;
    }

    try {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      if (rect.top <= vh + 100 && rect.bottom >= -100) {
        setIsVisible(true);
        return;
      }
    } catch {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 400);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      style={{
        clipPath: isVisible ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
        WebkitClipPath: isVisible ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
        opacity: isVisible ? 1 : 0.85,
        transitionProperty: 'clip-path, -webkit-clip-path, opacity',
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delayMs}ms`,
        willChange: 'clip-path, -webkit-clip-path',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        style={{
          transform: 'none', // Image itself does not move from bottom to top!
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
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

  const delayMs = delay < 10 ? delay * 1000 : delay;
  const durationMs = duration < 10 ? duration * 1000 : duration;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      setIsVisible(true);
      return;
    }

    try {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      if (rect.top <= vh + 100 && rect.bottom >= -100) {
        setIsVisible(true);
        return;
      }
    } catch {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 400);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      style={{
        clipPath: isVisible ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
        WebkitClipPath: isVisible ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
        opacity: isVisible ? 1 : 0.85,
        transitionProperty: 'clip-path, -webkit-clip-path, opacity',
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delayMs}ms`,
        willChange: 'clip-path, -webkit-clip-path',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      {children}
    </div>
  );
};
