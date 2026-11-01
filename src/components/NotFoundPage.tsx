import React from 'react';
import { ScrollReveal } from './ScrollReveal';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/portfolioData';
import { uiSfx } from '../utils/audio';

interface Props {
  lang: Language;
  onNavigateHome: () => void;
}

export const NotFoundPage: React.FC<Props> = ({ lang, onNavigateHome }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <div className="flex-1 min-h-[85vh] sm:min-h-[88vh] flex flex-col items-center justify-center px-6 text-center select-none">
      {/* Top [404] label in monospace */}
      <ScrollReveal delay={40} distance={15}>
        <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 tracking-wide mb-5 sm:mb-6">
          [404]
        </div>
      </ScrollReveal>

      {/* Main heading: i'm not here. */}
      <ScrollReveal delay={100} distance={20}>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight text-zinc-900 leading-none mb-8 sm:mb-10 lowercase font-sans">
          {t.notFoundTitle || "i’m not here."}
        </h1>
      </ScrollReveal>

      {/* Action button: • back to start */}
      <ScrollReveal delay={160} distance={15}>
        <button
          onClick={() => {
            uiSfx.playPop();
            onNavigateHome();
          }}
          onMouseEnter={() => uiSfx.playHover()}
          className="group inline-flex items-center gap-2 text-xs sm:text-[13px] font-normal text-zinc-800 hover:text-black transition-colors cursor-pointer py-1.5 px-3 rounded-full hover:bg-zinc-100/80 active:scale-95"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 group-hover:scale-125 transition-transform" />
          <span className="tracking-tight lowercase">{t.backToStart || 'back to start'}</span>
        </button>
      </ScrollReveal>
    </div>
  );
};
