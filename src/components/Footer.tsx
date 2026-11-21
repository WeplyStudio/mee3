import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { AnimatedArrowUpRight } from './AnimatedIcons';
import { FooterRobot } from './FooterRobot';
import { TRANSLATIONS } from '../data/portfolioData';
import { Language } from '../types';

interface FooterProps {
  footerProgress?: number;
  lang: Language;
  onNavigateHome: () => void;
  onNavigateAboutMe: () => void;
  onNavigateBio?: () => void;
  onNavigateStore?: () => void;
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
  onNavigateStore,
  onOpenContact,
  onScrollToProjects,
  onScrollToServices,
  onScrollToFaq,
}) => {
  const t = TRANSLATIONS[lang];
  const [isEmailHovered, setIsEmailHovered] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const bannerContainerRef = useRef<HTMLButtonElement | null>(null);
  const bannerTextRef = useRef<HTMLSpanElement | null>(null);
  const lastMeasuredWidthRef = useRef<number>(0);

  const emailText = 'hello@jayss.id';
  const emailDisplayText = emailText.toUpperCase();
  const emailCopyLabels: Record<Language, { hover: string; copied: string }> = {
    en: { hover: 'click to copy', copied: 'copied' },
    id: { hover: 'klik untuk salin', copied: 'tersalin' },
    de: { hover: 'zum kopieren klicken', copied: 'kopiert' },
    ja: { hover: 'クリックしてコピー', copied: 'コピーしました' },
  };
  const currentCopyLabel = emailCopyLabels[lang] || emailCopyLabels.en;

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
  const opacity = 0.55 + 0.45 * safeProgress;
  // Optical blur while peeking out, resolving crisp at 4/5 reveal (0.80)
  const rawFocus = Math.max(0, Math.min(1, safeProgress / 0.8));
  const smoothFocus = rawFocus * rawFocus * (3 - 2 * rawFocus);
  const footerBlurPx = smoothFocus >= 0.99 ? 0 : (1 - smoothFocus) * 14;

  return (
    <footer
      id="contact"
      className="sticky bottom-0 z-0 pt-14 sm:pt-16 pb-6 sm:pb-8 px-6 sm:px-12 bg-white min-h-[390px] overflow-hidden"
    >
      <div
        className="max-w-7xl mx-auto will-change-transform"
        style={{
          transform: `translate3d(0, ${translateY}px, 0) scale3d(${scale}, ${scale}, 1)`,
          opacity: opacity,
          filter: footerBlurPx > 0.05 ? `blur(${footerBlurPx.toFixed(2)}px)` : undefined,
          transformOrigin: 'top center',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >

        {/* Top Geometric Grid Columns */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-10 pb-10 sm:pb-12 border-b border-zinc-100">
          
          {/* Left Column: [contact] & get in touch (Flush Left) */}
          <div className=" flex flex-col justify-between">
            <ScrollReveal delay={100} distance={-20}>
              <div className="text-[11px] font-mono-code text-zinc-400 mb-3 lowercase tracking-wider leading-none">
                {t.contactLabel}
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={180} distance={-25}>
              <button
                onClick={onOpenContact}
                className="group inline-flex items-center gap-3 text-2xl sm:text-3xl font-normal tracking-tight text-zinc-900 hover:text-blue-700 transition-all duration-300 text-left cursor-pointer lowercase leading-none"
              >
                <span>{t.getInTouch}</span>
                <ArrowRight
                  size={22}
                  className="opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-blue-700"
                />
              </button>
            </ScrollReveal>
          </div>

          {/* Right Geometric Columns: [links] & [connect] (Flush Right) */}
          <div className="grid grid-cols-2 sm:flex sm:items-start gap-10 sm:gap-16 lg:gap-24 font-mono-code text-xs">
            
            {/* [links] — 2x3 Geometric Matrix */}
            <div>
              <ScrollReveal delay={120} distance={-20}>
                <div className="text-[11px] text-zinc-400 mb-3 lowercase tracking-wider leading-none">
                  {t.linksLabel}
                </div>
              </ScrollReveal>
              
              <ScrollReveal delay={200} distance={-25}>
                <div className="grid grid-cols-2 gap-x-10 sm:gap-x-12 gap-y-2 text-zinc-600">
                  <button
                    onClick={onNavigateHome}
                    className="h-5 inline-flex items-center hover:text-zinc-950 transition-colors duration-200 cursor-pointer lowercase text-left"
                  >
                    <span>{t.home}</span>
                  </button>
                  {onNavigateBio && (
                    <button
                      onClick={onNavigateBio}
                      className="h-5 inline-flex items-center hover:text-zinc-950 transition-colors duration-200 cursor-pointer lowercase text-left"
                    >
                      <span>bio</span>
                    </button>
                  )}
                  <button
                    onClick={onNavigateAboutMe}
                    className="h-5 inline-flex items-center hover:text-zinc-950 transition-colors duration-200 cursor-pointer lowercase text-left"
                  >
                    <span>{t.aboutme}</span>
                  </button>
                  {onScrollToServices && (
                    <button
                      onClick={onScrollToServices}
                      className="h-5 inline-flex items-center hover:text-zinc-950 transition-colors duration-200 cursor-pointer lowercase text-left"
                    >
                      <span>{t.services}</span>
                    </button>
                  )}
                  <button
                    onClick={onScrollToProjects}
                    className="h-5 inline-flex items-center hover:text-zinc-950 transition-colors duration-200 cursor-pointer lowercase text-left"
                  >
                    <span>{t.projects}</span>
                  </button>
                  {onNavigateStore ? (
                    <button
                      onClick={onNavigateStore}
                      className="h-5 inline-flex items-center hover:text-zinc-950 transition-colors duration-200 cursor-pointer lowercase text-left"
                    >
                      <span>store</span>
                    </button>
                  ) : (
                    onScrollToFaq && (
                      <button
                        onClick={onScrollToFaq}
                        className="h-5 inline-flex items-center hover:text-zinc-950 transition-colors duration-200 cursor-pointer lowercase text-left"
                      >
                        <span>{t.faq}</span>
                      </button>
                    )
                  )}
                </div>
              </ScrollReveal>
            </div>

            {/* [connect] — 1x3 Geometric Stack matching [links] height */}
            <div>
              <ScrollReveal delay={140} distance={-20}>
                <div className="text-[11px] text-zinc-400 mb-3 lowercase tracking-wider leading-none">
                  {t.connectLabel}
                </div>
              </ScrollReveal>
              
              <ScrollReveal delay={220} distance={-25}>
                <ul className="grid grid-cols-1 gap-y-2 text-zinc-600">
                  <li>
                    <a
                      href="https://instagram.com/jasonn.doc"
                      target="_blank"
                      rel="noreferrer"
                      className="group h-5 inline-flex items-center justify-between gap-2 hover:text-zinc-950 transition-colors lowercase"
                    >
                      <span>{t.instagram}</span>
                      <AnimatedArrowUpRight size={11} className="text-zinc-400 group-hover:text-zinc-950 transition-colors" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://wa.me/6288808943176"
                      target="_blank"
                      rel="noreferrer"
                      className="group h-5 inline-flex items-center justify-between gap-2 hover:text-zinc-950 transition-colors lowercase"
                    >
                      <span>whatsapp</span>
                      <AnimatedArrowUpRight size={11} className="text-zinc-400 group-hover:text-zinc-950 transition-colors" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:hello@jayss.id"
                      className="group h-5 inline-flex items-center justify-between gap-2 hover:text-zinc-950 transition-colors lowercase"
                    >
                      <span>email</span>
                      <AnimatedArrowUpRight size={11} className="text-zinc-400 group-hover:text-zinc-950 transition-colors" />
                    </a>
                  </li>
                </ul>
              </ScrollReveal>
            </div>

          </div>
        </div>

        {/* Giant HELLO@JAYSS.ID Click-to-Copy Interactive Banner */}
        <ScrollReveal delay={100} distance={-30}>
          <div className="pt-7 sm:pt-8 pb-2 sm:pb-3 group relative">
            <button
              ref={bannerContainerRef}
              type="button"
              onClick={handleCopyEmail}
              onMouseEnter={() => setIsEmailHovered(true)}
              onMouseLeave={() => setIsEmailHovered(false)}
              title={currentCopyLabel.hover}
              className="w-full block text-left font-geist font-light uppercase tracking-[-0.03em] text-zinc-950 leading-none whitespace-nowrap select-none cursor-pointer"
              style={{ fontWeight: 300 }}
            >
              <span
                ref={bannerTextRef}
                className="inline-block whitespace-nowrap leading-none font-light"
                style={{ fontSize: '14vw', fontWeight: 300 }}
              >
                {emailDisplayText}
              </span>
            </button>
            <div
              className={`mt-1.5 text-center text-xs font-mono-code tracking-wider transition-all duration-300 ${
                copiedEmail || isEmailHovered
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 -translate-y-1 pointer-events-none'
              } ${copiedEmail ? 'text-zinc-900' : 'text-zinc-400'}`}
            >
              [{copiedEmail ? currentCopyLabel.copied : currentCopyLabel.hover}]
            </div>
          </div>
        </ScrollReveal>

        {/* Bottom Row: Option 1 Split — Stacked Location & Copyright (Bottom-Left) + 3D Robot (Bottom-Right) */}
        <ScrollReveal delay={150} distance={-15}>
          <div className="pt-2 sm:pt-3 flex items-end justify-between gap-4 text-xs text-zinc-400 font-mono-code lowercase">
            <div className="flex flex-col items-start gap-1 pb-2">
              <span>indonesia</span>
              <span>{t.designedBy}</span>
            </div>
            <FooterRobot
              isActive={safeProgress > 0.02}
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 -mr-2 sm:-mr-3"
            />
          </div>
        </ScrollReveal>
      </div>
    </footer>
  );
};
