import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  text: string;
  onOpenStory: () => void;
  myStoryLabel: string;
  scrollHintLabel?: string;
  scrollContinueLabel?: string;
  className?: string;
}

interface QuoteWordToken {
  word: string;
  trailingPunct: string;
  isHighlighted: boolean;
  highlightPos: 'none' | 'single' | 'start' | 'mid' | 'end';
  index: number;
}

function parseQuoteTokens(rawText: string): QuoteWordToken[] {
  if (!rawText) return [];
  const segments = rawText.split(/(==.*?==)/g).filter(Boolean);
  const rawTokens: QuoteWordToken[] = [];
  let cursor = 0;

  for (const seg of segments) {
    const isHighlighted = seg.startsWith('==') && seg.endsWith('==') && seg.length > 4;
    const cleanSeg = isHighlighted ? seg.slice(2, -2) : seg;
    const trimmed = cleanSeg.trim();
    if (!trimmed) continue;

    // Attach pure leading punctuation (e.g. "." or "," right after a ==phrase==) to the previous token
    const leadingPunctMatch = trimmed.match(/^([.,;:!?。、]+)(?:\s+(.*))?$/);
    if (leadingPunctMatch && rawTokens.length > 0 && !isHighlighted) {
      rawTokens[rawTokens.length - 1].trailingPunct += leadingPunctMatch[1];
      const remainder = (leadingPunctMatch[2] || '').trim();
      if (!remainder) continue;
      const words = remainder.split(/\s+/).filter(Boolean);
      for (const word of words) {
        rawTokens.push({
          word,
          trailingPunct: '',
          isHighlighted: false,
          highlightPos: 'none',
          index: cursor++,
        });
      }
      continue;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    words.forEach((word, idx) => {
      let highlightPos: QuoteWordToken['highlightPos'] = 'none';
      if (isHighlighted) {
        if (words.length === 1) highlightPos = 'single';
        else if (idx === 0) highlightPos = 'start';
        else if (idx === words.length - 1) highlightPos = 'end';
        else highlightPos = 'mid';
      }
      rawTokens.push({
        word,
        trailingPunct: '',
        isHighlighted,
        highlightPos,
        index: cursor++,
      });
    });
  }

  return rawTokens;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const AnimatedQuote: React.FC<Props> = ({
  text,
  onOpenStory,
  myStoryLabel,
  scrollHintLabel = 'scroll slowly to read the full story ↓',
  scrollContinueLabel = 'continue scrolling to selected works ↓',
  className = 'mt-16 sm:mt-24',
}) => {
  const runwayRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const tokens = useMemo(() => parseQuoteTokens(text), [text]);
  const totalWords = Math.max(1, tokens.length);

  // Sticky Scroll-Lock Progress:
  // Inner viewport is pinned (`sticky top-0 h-screen`) while scrolling through runwayRef.
  // Words fill smoothly from gray to black and blue stabilo sweeps across key phrases before unlocking scroll.
  useEffect(() => {
    let rafId: number | null = null;
    let currentSmoothed = 0;
    let targetProgress = 0;
    let mounted = true;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const computeTarget = () => {
      if (!runwayRef.current) return;
      if (prefersReducedMotion) {
        targetProgress = 1;
        return;
      }
      const rect = runwayRef.current.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const lockedDistance = Math.max(1, rect.height - vh);
      const raw = -rect.top / lockedDistance;
      targetProgress = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(1, raw));
    };

    const tick = () => {
      if (!mounted) return;
      computeTarget();
      const diff = targetProgress - currentSmoothed;
      if (Math.abs(diff) > 0.0008) {
        currentSmoothed += diff * 0.18;
        setProgress(currentSmoothed);
        rafId = window.requestAnimationFrame(tick);
      } else {
        if (currentSmoothed !== targetProgress) {
          currentSmoothed = targetProgress;
          setProgress(currentSmoothed);
        }
        rafId = null;
      }
    };

    const onScroll = () => {
      computeTarget();
      if (rafId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    computeTarget();
    currentSmoothed = targetProgress;
    setProgress(currentSmoothed);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      mounted = false;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [text]);

  // Ensure all words reach pure black by progress = 0.88 for clean breathing room before scrolling past
  const fillWindowSpan = 0.16;
  const maxStart = 0.88 - fillWindowSpan;
  const isCompleted = progress >= 0.9;
  const buttonOpacity = smoothstep(0.5, 0.9, progress);
  const buttonTranslateY = (1 - buttonOpacity) * 12;

  return (
    <div
      ref={runwayRef}
      data-gsap-custom="true"
      className={`relative h-[210vh] sm:h-[235vh] ${className}`}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center pt-20 sm:pt-24 pb-10 px-4 sm:px-8">
        <div className="max-w-3xl w-full mx-auto text-center space-y-6 sm:space-y-8">
          {/* Balanced Editorial Scroll-Lock & Blue Stabilo Quote */}
          <p className="text-lg sm:text-[1.35rem] md:text-[1.6rem] lg:text-[1.8rem] leading-[1.6] sm:leading-[1.52] tracking-tight font-story-heavy text-balance">
            <span className="text-zinc-300 mr-1 select-none">&ldquo;</span>
            {tokens.map((token) => {
              const wordStart =
                totalWords > 1 ? (token.index / (totalWords - 1)) * maxStart : 0;
              const wordProgress = smoothstep(
                wordStart,
                wordStart + fillWindowSpan,
                progress
              );

              // Smooth RGB transition from soft neutral gray rgb(196, 196, 204) -> crisp black rgb(12, 12, 14)
              const r = Math.round(196 - (196 - 12) * wordProgress);
              const g = Math.round(196 - (196 - 12) * wordProgress);
              const b = Math.round(204 - (204 - 14) * wordProgress);

              // Subtle Blue Stabilo sweep synchronized with reading progress
              const stabiloProgress = token.isHighlighted
                ? smoothstep(0.18, 0.85, wordProgress)
                : 0;

              const spanEdges =
                token.highlightPos === 'start'
                  ? '-left-1 -right-[0.3em] rounded-l-[4px]'
                  : token.highlightPos === 'mid'
                    ? 'left-0 -right-[0.3em]'
                    : token.highlightPos === 'end'
                      ? 'left-0 -right-1 rounded-r-[4px]'
                      : '-inset-x-1 rounded-[4px]';

              return (
                <span
                  key={token.index}
                  className="relative inline-block mr-[0.26em] font-story-heavy"
                  style={{
                    color: `rgb(${r}, ${g}, ${b})`,
                  }}
                >
                  {token.isHighlighted && (
                    <span className="relative inline-block">
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-[0.06em] top-[0.14em] z-0 origin-left pointer-events-none ${spanEdges}`}
                        style={{
                          background:
                            'linear-gradient(100deg, rgba(191, 219, 254, 0.72) 0%, rgba(147, 197, 253, 0.58) 100%)',
                          transform: `scaleX(${stabiloProgress})`,
                          opacity: stabiloProgress > 0.02 ? 1 : 0,
                        }}
                      />
                      <span className="relative z-10">{token.word}</span>
                    </span>
                  )}
                  {!token.isHighlighted && (
                    <span className="relative z-10">{token.word}</span>
                  )}
                  {token.trailingPunct && (
                    <span className="relative z-10">{token.trailingPunct}</span>
                  )}
                </span>
              );
            })}
            <span
              className="ml-0.5 select-none transition-colors duration-300"
              style={{
                color: isCompleted ? 'rgb(12, 12, 14)' : 'rgb(196, 196, 204)',
              }}
            >
              &rdquo;
            </span>
          </p>

          {/* My Story Button + Subtle Unlock Cue */}
          <div
            className="flex flex-col items-center gap-2.5 pt-1"
            style={{
              opacity: Math.max(0.25, buttonOpacity),
              transform: `translateY(${buttonTranslateY}px)`,
            }}
          >
            <button
              type="button"
              onClick={onOpenStory}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-300 hover:border-zinc-950 bg-white hover:bg-zinc-950 text-zinc-900 hover:text-white text-xs sm:text-[13px] font-medium transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span>{myStoryLabel} →</span>
            </button>
            <span className="text-[11px] font-mono-code text-zinc-400 lowercase">
              {isCompleted ? scrollContinueLabel : scrollHintLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
