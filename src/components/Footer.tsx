import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { AnimatedArrowUpRight } from './AnimatedIcons';
import { TRANSLATIONS } from '../data/portfolioData';
import { Language } from '../types';

interface FooterProps {
  footerProgress?: number;
  lang: Language;
  onNavigateHome: () => void;
  onNavigateAboutMe: () => void;
  onNavigateBio?: () => void;
  onOpenContact: () => void;
  onScrollToProjects: () => void;
  onScrollToServices?: () => void;
  onScrollToFaq?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  footerProgress = 0,
  lang,
  onNavigateHome,
  onNavigateAboutMe,
  onNavigateBio,
  onOpenContact,
  onScrollToProjects,
  onScrollToServices,
  onScrollToFaq,
}) => {
  const t = TRANSLATIONS[lang];
  const [hoveredLetter, setHoveredLetter] = useState<number | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const bannerContainerRef = useRef<HTMLButtonElement | null>(null);
  const bannerTextRef = useRef<HTMLSpanElement | null>(null);
  const lastMeasuredWidthRef = useRef<number>(0);

  const emailText = 'hello@jayss.id';
  const logoLetters = Array.from(emailText);

  const fitBannerText = useCallback((force = false) => {
    const container = bannerContainerRef.current;
    const textEl = bannerTextRef.current;
    if (!container || !textEl) return;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;
    if (!force && Math.abs(availableWidth - lastMeasuredWidthRef.current) < 0.5) return;

    lastMeasuredWidthRef.current = availableWidth;

    const prevFontSize = textEl.style.fontSize;
    textEl.style.fontSize = '200px';
    const measuredWidth = textEl.offsetWidth;
    if (measuredWidth > 0) {
      const fittedSize = (availableWidth / measuredWidth) * 200;
      textEl.style.fontSize = `${fittedSize}px`;
    } else {
      textEl.style.fontSize = prevFontSize;
    }
  }, []);

  useLayoutEffect(() => {
    fitBannerText(true);

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        fitBannerText(true);
      });
    }

    const container = bannerContainerRef.current;
    let rafId: number | null = null;

    const handleResize = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        fitBannerText(false);
      });
    };

    if (!container || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => {
        if (rafId !== null) window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
      };
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const newWidth = entry?.contentRect?.width ?? container.clientWidth;
      if (Math.abs(newWidth - lastMeasuredWidthRef.current) < 0.5) return;
      handleResize();
    });
    observer.observe(container);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [fitBannerText]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailText);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = emailText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(textarea);
    }
    setCopiedEmail(true);
    window.setTimeout(() => {
      setCopiedEmail(false);
    }, 2000);
  };

  const safeProgress = typeof footerProgress === 'number' && !Number.isNaN(footerProgress) ? footerProgress : 0;

  // Dynamic downward reveal animation:
  // When hidden/about to reveal (safeProgress = 0), footer starts tucked higher up (-70px)
  // and glides gracefully DOWNWARDS into place (0px) as the curtain lifts up.
  const translateY = Math.round((safeProgress - 1) * 70);
  const scale = 0.96 + 0.04 * safeProgress;
  const opacity = 0.35 + 0.65 * safeProgress;

  return (
    <footer
      id="contact"
      className="sticky bottom-0 z-0 pt-16 sm:pt-20 pb-12 px-6 sm:px-12 bg-white min-h-[440px] overflow-hidden"
    >
      <div 
        className="max-w-7xl mx-auto will-change-transform"
        style={{
          transform: `translate3d(0, ${translateY}px, 0) scale3d(${scale}, ${scale}, 1)`,
          opacity: opacity,
          transformOrigin: 'top center',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        
        {/* Top Grid Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 pb-16">
          
          {/* Column 1: [contact] & get in touch */}
          <div className="sm:col-span-6 space-y-3">
            <ScrollReveal delay={100} distance={-20}>
              <div className="text-[11px] font-mono-code text-zinc-400 lowercase tracking-wider">
                {t.contactLabel}
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={180} distance={-25}>
              <div className="space-y-1">
                <button
                  onClick={onOpenContact}
                  className="group inline-flex items-center gap-3 text-2xl sm:text-3.5xl font-normal tracking-tight text-zinc-900 hover:text-blue-700 transition-all duration-300 text-left cursor-pointer lowercase"
                >
                  <span>{t.getInTouch}</span>
                  <ArrowRight
                    size={24}
                    className="opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-blue-700"
                  />
                </button>
              </div>
            </ScrollReveal>
          </div>

          {/* Column 2: [links] */}
          <div className="sm:col-span-3 space-y-2 font-mono-code text-xs">
            <ScrollReveal delay={120} distance={-20}>
              <div className="text-[11px] text-zinc-400 mb-2 lowercase tracking-wider">
                {t.linksLabel}
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={200} distance={-25}>
              <ul className="space-y-1.5 text-zinc-600">
                <li>
                  <button
                    onClick={onNavigateHome}
                    className="hover:text-black hover:translate-x-1 transition-all duration-200 cursor-pointer lowercase flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-300 group-hover:bg-zinc-800"></span>
                    <span>{t.home}</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={onNavigateAboutMe}
                    className="hover:text-black hover:translate-x-1 transition-all duration-200 cursor-pointer lowercase flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-300 group-hover:bg-zinc-800"></span>
                    <span>{t.aboutme}</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={onScrollToProjects}
                    className="hover:text-black hover:translate-x-1 transition-all duration-200 cursor-pointer lowercase flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-300 group-hover:bg-zinc-800"></span>
                    <span>{t.projects}</span>
                  </button>
                </li>
                {onNavigateBio && (
                  <li>
                    <button
                      onClick={onNavigateBio}
                      className="hover:text-black hover:translate-x-1 transition-all duration-200 cursor-pointer lowercase flex items-center gap-1.5"
                    >
                      <span className="w-1 h-1 rounded-full bg-zinc-300 group-hover:bg-zinc-800"></span>
                      <span>bio</span>
                    </button>
                  </li>
                )}
                {onScrollToServices && (
                  <li>
                    <button
                      onClick={onScrollToServices}
                      className="hover:text-black hover:translate-x-1 transition-all duration-200 cursor-pointer lowercase flex items-center gap-1.5"
                    >
                      <span className="w-1 h-1 rounded-full bg-zinc-300 group-hover:bg-zinc-800"></span>
                      <span>{t.services}</span>
                    </button>
                  </li>
                )}
                {onScrollToFaq && (
                  <li>
                    <button
                      onClick={onScrollToFaq}
                      className="hover:text-black hover:translate-x-1 transition-all duration-200 cursor-pointer lowercase flex items-center gap-1.5"
                    >
                      <span className="w-1 h-1 rounded-full bg-zinc-300 group-hover:bg-zinc-800"></span>
                      <span>{t.faq}</span>
                    </button>
                  </li>
                )}
              </ul>
            </ScrollReveal>
          </div>

          {/* Column 3: [connect] */}
          <div className="sm:col-span-3 space-y-2 font-mono-code text-xs">
            <ScrollReveal delay={140} distance={-20}>
              <div className="text-[11px] text-zinc-400 mb-2 lowercase tracking-wider">
                {t.connectLabel}
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={220} distance={-25}>
              <ul className="space-y-1.5 text-zinc-600">
                <li>
                  <a
                    href="https://instagram.com/jasonn.doc"
                    target="_blank"
                    rel="noreferrer"
                    className="group hover:text-black transition-colors flex items-center gap-1.5 lowercase"
                  >
                    <span>{t.instagram}</span>
                    <AnimatedArrowUpRight size={12} className="text-zinc-400 group-hover:text-black transition-colors" />
                  </a>
                </li>
              </ul>
            </ScrollReveal>
          </div>
        </div>

        {/* Giant hello@jayss.id Click-to-Copy Interactive Banner */}
        <ScrollReveal delay={100} distance={-30}>
          <div className="py-8 group relative">
            <button
              ref={bannerContainerRef}
              type="button"
              onClick={handleCopyEmail}
              title="Click to copy hello@jayss.id"
              className="w-full block text-left font-geist tracking-[-0.04em] text-zinc-950 leading-none whitespace-nowrap select-none transition-colors duration-500 cursor-pointer"
            >
              <span
                ref={bannerTextRef}
                className="inline-block whitespace-nowrap leading-none"
                style={{ fontSize: '14vw' }}
              >
                {logoLetters.map((char, index) => (
                  <span
                    key={index}
                    onMouseEnter={() => setHoveredLetter(index)}
                    onMouseLeave={() => setHoveredLetter(null)}
                    className={`inline-block transition-transform duration-300 ${
                      copiedEmail
                        ? 'text-blue-700 -translate-y-1'
                        : hoveredLetter === index
                        ? '-translate-y-3 scale-105 text-blue-700'
                        : hoveredLetter !== null && Math.abs(hoveredLetter - index) === 1
                        ? '-translate-y-1.5 text-zinc-800'
                        : ''
                    }`}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </button>
            <div
              className={`mt-3 text-center text-xs font-mono-code lowercase tracking-wider transition-all duration-300 ${
                copiedEmail ? 'text-blue-700 opacity-100 translate-y-0' : 'text-zinc-400 opacity-0 -translate-y-1 pointer-events-none'
              }`}
            >
              [copied hello@jayss.id]
            </div>
          </div>
        </ScrollReveal>

        {/* Bottom Copyright & Location Row */}
        <ScrollReveal delay={150} distance={-15}>
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-zinc-400 font-mono-code lowercase">
            <span>indonesia</span>
            <div className="flex items-center gap-4">
              <span>{t.designedBy}</span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </footer>
  );
};
