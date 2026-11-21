import React from 'react';
import { ScrollReveal } from './ScrollReveal';

interface Props {
  text: string;
  subText?: string;
  onOpenStory: () => void;
  myStoryLabel: string;
  scrollHintLabel?: string;
  scrollContinueLabel?: string;
  className?: string;
}

export const AnimatedQuote: React.FC<Props> = ({
  text,
  subText,
  onOpenStory,
  myStoryLabel,
  className = 'mt-36 sm:mt-48 md:mt-56 mb-12 sm:mb-20',
}) => {
  const cleanText = text.replace(/==/g, '');

  return (
    <div className={`w-full px-4 sm:px-6 ${className}`}>
      <ScrollReveal distance={20}>
        <div className="max-w-[550px] mx-auto">
          <p
            data-explanatory="true"
            className="max-w-[490px] text-left text-[15px] sm:text-[17px] md:text-[18px] leading-[1.6] font-normal tracking-[-0.01em] text-zinc-900"
          >
            {cleanText}
          </p>

          {subText && (
            <p
              data-explanatory="true"
              className="mt-1.5 text-right text-[11px] sm:text-xs leading-relaxed font-normal text-zinc-400"
            >
              {subText}
            </p>
          )}

          <div className="mt-14 sm:mt-16 flex justify-center">
            <button
              type="button"
              onClick={onOpenStory}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[5px] bg-[#ececee] hover:bg-[#e2e2e5] border border-zinc-300/60 text-zinc-800 hover:text-black text-xs font-normal tracking-tight lowercase transition-colors cursor-pointer active:scale-[0.98] whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
              <span>{myStoryLabel}</span>
            </button>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};
