import React from 'react';
import { ScrollReveal } from './ScrollReveal';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/portfolioData';

interface Props {
  lang: Language;
  onNavigateHome: () => void;
}

export const NotFoundPage: React.FC<Props> = ({ lang, onNavigateHome }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-24 sm:py-36 text-center select-none">
      <ScrollReveal delay={100} distance={30}>
        {/* Giant Bracketed 404 */}
        <h1 className="text-7xl sm:text-9xl md:text-[13rem] lg:text-[16rem] font-bold tracking-tighter text-zinc-900 leading-none font-sans">
          {t.notFoundTitle}
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={200} distance={20}>
        <div className="mt-8 sm:mt-12 space-y-4 max-w-md mx-auto">
          {/* Subtitle text matching reference screenshot */}
          <p className="text-xs sm:text-sm text-zinc-500 font-normal lowercase tracking-tight">
            {t.notFoundDesc}
          </p>

          {/* Back to Home action button */}
          <div className="pt-2">
            <button
              onClick={onNavigateHome}
              className="group inline-flex items-center gap-2 text-xs sm:text-[13px] font-medium text-zinc-900 hover:text-black transition-all cursor-pointer py-2 px-4 rounded-full hover:bg-zinc-200/50"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 group-hover:scale-125 transition-transform"></span>
              <span className="tracking-tight lowercase">{t.backHome}</span>
            </button>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};
