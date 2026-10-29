import React from 'react';
import { useScrollProgress } from '../utils/scrollAnimation';

interface Props {
  text: string;
  onOpenStory: () => void;
  myStoryLabel: string;
  className?: string;
}

export const AnimatedQuote: React.FC<Props> = ({
  text,
  onOpenStory,
  myStoryLabel,
  className = "mt-48 sm:mt-64 md:mt-80 text-center max-w-2xl mx-auto space-y-8 px-4",
}) => {
  const { ref, progress } = useScrollProgress();

  const safeProgress = typeof progress === 'number' && !Number.isNaN(progress) ? Math.max(0, Math.min(1, progress)) : 0;

  // Split text into words for progressive character/word scroll color animation
  const words = text ? text.split(' ') : [];

  // Global slide up transform (45px -> 0px) and fade-in
  const translateY = 45 * (1 - safeProgress);
  const opacity = Math.max(0, Math.min(1, 0.25 + 0.75 * safeProgress));

  return (
    <div ref={ref} className={className}>
      {/* Animated Paragraph */}
      <p
        className="text-sm sm:text-base md:text-lg leading-relaxed font-normal tracking-wide transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${translateY}px)`,
          opacity: opacity,
        }}
      >
        "{words.map((word, idx) => {
          // Calculate when this specific word should transition from gray to black
          const wordThreshold = words.length > 0 ? (idx / words.length) * 0.75 : 0;
          const rawWordProgress = (safeProgress - wordThreshold) / 0.25;
          const wordProgress = Number.isNaN(rawWordProgress) ? 0 : Math.max(0, Math.min(1, rawWordProgress));

          // Interpolate RGB color:
          // Gray: rgb(161, 161, 170) -> Black: rgb(17, 17, 17)
          const r = Math.round(161 - (161 - 17) * wordProgress);
          const g = Math.round(161 - (161 - 17) * wordProgress);
          const b = Math.round(170 - (170 - 17) * wordProgress);

          const wordStyle: React.CSSProperties = {
            color: `rgb(${r}, ${g}, ${b})`,
            transition: 'color 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease-out',
            display: 'inline-block',
            marginRight: '0.28em',
          };

          return (
            <span key={idx} style={wordStyle}>
              {word}
            </span>
          );
        })}"
      </p>

      {/* Button with smooth slide up */}
      <div
        style={{
          transform: `translateY(${translateY * 0.6}px)`,
          opacity: opacity,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <button
          onClick={onOpenStory}
          className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full border border-zinc-300 hover:border-zinc-900 bg-white hover:bg-zinc-50 text-zinc-800 hover:text-black text-xs font-medium transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span>
          <span>{myStoryLabel}</span>
        </button>
      </div>
    </div>
  );
};
