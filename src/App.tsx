/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import Lenis from 'lenis';
import { AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, ArrowUpRight } from 'lucide-react';
import { AnimatedSoundWave } from './components/AnimatedIcons';
import { getProjectsData, getPrinciplesList, getPhilosophyData, getServicesData, getStatsData, getFaqData, TRANSLATIONS } from './data/portfolioData';
import { ProjectMockup } from './components/ProjectMockup';
import { MorphingMenu } from './components/MorphingMenu';
import { AnimatedQuote } from './components/AnimatedQuote';
import { ScrollReveal } from './components/ScrollReveal';
import { ShutterRevealImage } from './components/ShutterRevealImage';
import { VisualCurationMarquee } from './components/VisualCurationMarquee';
import { Footer } from './components/Footer';
import { CurtainBlindsTransition, BlindsTransitionStage } from './components/CurtainBlindsTransition';
import { BottomScrollProgress } from './components/BottomScrollProgress';
import { InteractiveBrandName } from './components/InteractiveBrandName';
import { EncryptedPrinciple } from './components/EncryptedPrinciple';
import { LiveClock } from './components/LiveClock';
import { ImageTooltip, getProjectTooltipText } from './components/ImageTooltip';
import { AnimatedStatCard } from './components/AnimatedStatCard';
import { AskTheCloud } from './components/AskTheCloud';
import { GsapGlobalAnimator } from './components/GsapGlobalAnimator';
import { ambientSound, setupGlobalUISFX, uiSfx } from './utils/audio';
import { Language, Project } from './types';

import { AboutMePage } from './components/AboutMePage';
import { ProjectsPage } from './components/ProjectsPage';
import { ContactPage } from './components/ContactPage';
import { ProjectDetailPage } from './components/ProjectDetailPage';
import { BioPage } from './components/BioPage';
import { StorePage } from './components/StorePage';
import { NotFoundPage } from './components/NotFoundPage';
const ContactModal = lazy(() => import('./components/ContactModal').then(m => ({ default: m.ContactModal })));

import {
  SiteImageSettings,
  fetchSiteSettings,
  fetchProjectsFromFirestore,
} from './lib/firebase';

type PageType = 'home' | 'aboutme' | 'projects' | 'contact' | 'project-detail' | 'bio' | 'store' | '404';

interface NavigationTarget {
  page: PageType;
  targetPath?: string;
  project?: Project | null;
  callback?: () => void;
  skipHistory?: boolean;
}

// Utility to extract initial language from query parameters or default to 'en'
function getInitialLang(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang')?.toLowerCase();
    if (langParam === 'id' || langParam === 'en' || langParam === 'de' || langParam === 'ja') {
      return langParam;
    }
  } catch {}
  return 'en';
}

// Utility to parse the current URL (pathname & hash) and determine the active page & project
function parseLocationFromUrl(currentLang: Language = 'en'): { page: PageType; project: Project | null; path: string } {
  if (typeof window === 'undefined') {
    return { page: 'home', project: null, path: '/' };
  }

  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '').trim();

  // If path is root '/' but hash specifies a page (e.g. #aboutme, #/contact)
  const route = (rawPath === '/' && hash && !hash.startsWith('projects') && !hash.startsWith('services') && !hash.startsWith('stats') && !hash.startsWith('faq'))
    ? `/${hash}`
    : rawPath;

  if (route === '/' || route === '' || route === '/home') {
    return { page: 'home', project: null, path: '/' };
  }

  if (route === '/aboutme' || route === '/about') {
    return { page: 'aboutme', project: null, path: '/aboutme' };
  }

  if (route === '/projects' || route === '/works') {
    return { page: 'projects', project: null, path: '/projects' };
  }

  if (route === '/contact' || route === '/get-in-touch') {
    return { page: 'contact', project: null, path: '/contact' };
  }

  if (route === '/bio' || route === '/links') {
    return { page: 'bio', project: null, path: '/bio' };
  }

  if (
    route === '/store' ||
    route === '/shop' ||
    route.startsWith('/store/') ||
    route.startsWith('/produk/') ||
    route === '/cart' ||
    route.startsWith('/pay/') ||
    route.startsWith('/receipt/') ||
    route === '/ulasan' ||
    route === '/transaksi' ||
    route === '/refund' ||
    route.startsWith('/ticket/') ||
    route === '/dashboard' ||
    route === '/new/product' ||
    route === '/promo'
  ) {
    return { page: 'store', project: null, path: route === '/shop' ? '/store' : rawPath };
  }

  if (route === '/404') {
    return { page: '404', project: null, path: '/404' };
  }

  // Check project detail routes: /project/:id or /projects/:id or direct slug /zylo
  const projectDetailMatch = route.match(/^\/(?:project|projects)\/([a-z0-9_-]+)$/i);
  const directSlugMatch = route.match(/^\/([a-z0-9_-]+)$/i);
  const candidateId = projectDetailMatch ? projectDetailMatch[1] : (directSlugMatch ? directSlugMatch[1] : null);

  if (candidateId) {
    const allProjects = getProjectsData(currentLang);
    const matched = allProjects.find((p) => p.id.toLowerCase() === candidateId.toLowerCase());
    if (matched) {
      return { page: 'project-detail', project: matched, path: `/project/${matched.id}` };
    }
  }

  // If none matched, route directly to the 404 page
  return { page: '404', project: null, path: rawPath };
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => getInitialLang());
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [expandedThought, setExpandedThought] = useState<string>('01');
  const [expandedService, setExpandedService] = useState<string>('01');
  const [expandedFaq, setExpandedFaq] = useState<string>('01');

  // Synchronous route initialization on first mount
  const [currentPage, setCurrentPage] = useState<PageType>(() => parseLocationFromUrl(getInitialLang()).page);
  const [activeProject, setActiveProject] = useState<Project | null>(() => parseLocationFromUrl(getInitialLang()).project);
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Firestore persistent site settings and portfolio projects
  const [siteSettings, setSiteSettings] = useState<SiteImageSettings | null>(null);
  const [firestoreProjects, setFirestoreProjects] = useState<Project[]>([]);

  const loadFirestoreData = async () => {
    try {
      const [settings, dbProjects] = await Promise.all([
        fetchSiteSettings(),
        fetchProjectsFromFirestore(),
      ]);
      if (settings) setSiteSettings(settings);
      if (dbProjects && dbProjects.length > 0) setFirestoreProjects(dbProjects);
    } catch (err) {
      console.debug('Firestore sync error:', err);
    }
  };

  useEffect(() => {
    loadFirestoreData();
  }, []);

  // Blinds Curtain Transition State
  const [blindsStage, setBlindsStage] = useState<BlindsTransitionStage>('idle');
  const [transitionTitle, setTransitionTitle] = useState<string>('jason');
  const pendingNavRef = useRef<NavigationTarget | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const blindsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPageRef = useRef<PageType>(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Clean up any pending transition timer on unmount
  useEffect(() => {
    return () => {
      if (blindsTimerRef.current) {
        clearTimeout(blindsTimerRef.current);
      }
    };
  }, []);

  // Initialize uisfx global audio handlers
  useEffect(() => {
    setupGlobalUISFX();
  }, []);

  const lenisRef = useRef<Lenis | null>(null);

  // Motion Curtain Blinds safe navigation helper
  const navigateTo = (
    page: PageType,
    targetPath?: string,
    options?: { project?: Project | null; callback?: () => void; skipHistory?: boolean }
  ) => {
    // Prevent overlapping transitions if a transition is already in flight
    if (isTransitioningRef.current || blindsStage !== 'idle') {
      return;
    }

    // If already on the requested page with no project change or special callback, just scroll top
    if (page === currentPageRef.current && !options?.project && !options?.callback) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Set transition label for the blinds center indicator
    let title = 'jason';
    if (options?.project) {
      title = options.project.title;
    } else if (page === 'aboutme') {
      title = 'about me';
    } else if (page === 'projects') {
      title = 'selected works';
    } else if (page === 'contact') {
      title = 'get in touch';
    } else if (page === 'bio') {
      title = 'bio';
    } else if (page === 'store') {
      title = 'store';
    } else if (page === 'home') {
      title = 'jason';
    } else if (page === '404') {
      title = '404 not found';
    }
    setTransitionTitle(title);

    pendingNavRef.current = {
      page,
      targetPath,
      project: options?.project,
      callback: options?.callback,
      skipHistory: options?.skipHistory,
    };
    isTransitioningRef.current = true;

    try {
      uiSfx.playSwitch();
    } catch {}

    // Trigger blinds closing animation across the screen
    setBlindsStage('closing');
  };

  // Called when all curtain blinds have fully closed over the screen
  const handleBlindsClosed = useCallback(() => {
    const pending = pendingNavRef.current;
    if (pending) {
      setCurrentPage(pending.page);
      currentPageRef.current = pending.page;
      if (pending.project !== undefined) {
        setActiveProject(pending.project);
      }
      if (pending.callback) {
        pending.callback();
      }

      // Reset scroll position instantaneously behind the curtains
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      }
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Update browser history URL
      if (!pending.skipHistory) {
        try {
          let path = pending.targetPath;
          if (!path) {
            if (pending.page === 'home') path = '/';
            else if (pending.page === 'aboutme') path = '/aboutme';
            else if (pending.page === 'projects') path = '/projects';
            else if (pending.page === 'contact') path = '/contact';
            else if (pending.page === 'bio') path = '/bio';
            else if (pending.page === 'store') path = '/store';
            else if (pending.page === '404') path = '/404';
            else if (pending.page === 'project-detail' && pending.project) path = `/project/${pending.project.id}`;
            else path = `/${pending.page}`;
          }

          if (window.location.pathname !== path) {
            window.history.pushState({ page: pending.page, projectId: pending.project?.id }, '', path);
          }
        } catch {}
      }
    }

    if (blindsTimerRef.current) {
      clearTimeout(blindsTimerRef.current);
    }

    blindsTimerRef.current = setTimeout(() => {
      setBlindsStage('opening');
    }, 16);
  }, []);

  // Called when all curtain blinds have fully opened and revealed the new page
  const handleBlindsOpened = useCallback(() => {
    if (blindsTimerRef.current) {
      clearTimeout(blindsTimerRef.current);
      blindsTimerRef.current = null;
    }
    setBlindsStage('idle');
    isTransitioningRef.current = false;
    pendingNavRef.current = null;
  }, []);

  // Hash, Path, and Popstate route listener (Handles back/forward browser navigation & hash links)
  useEffect(() => {
    const handlePopState = () => {
      const { page, project } = parseLocationFromUrl(lang);
      
      if (page !== currentPageRef.current || (page === 'project-detail' && project?.id !== activeProject?.id)) {
        setCurrentPage(page);
        currentPageRef.current = page;
        setActiveProject(project);

        if (lenisRef.current) {
          lenisRef.current.scrollTo(0, { immediate: true });
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [lang, activeProject]);

  // Initialize Ultra-Smooth Inertia Scrolling (Lenis) with 60fps/120fps fluid physics
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.05,
      touchMultiplier: 1.15,
      infinite: false,
    });
    lenisRef.current = lenis;

    let reqId: number;
    function raf(time: number) {
      lenis.raf(time);
      reqId = requestAnimationFrame(raf);
    }
    reqId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(reqId);
      lenis.destroy();
    };
  }, []);

  const [footerProgress, setFooterProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const updateFooterProgress = () => {
      ticking = false;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight || 0;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;

      const totalScrollable = scrollHeight - clientHeight;
      if (totalScrollable <= 0) {
        setFooterProgress(1);
        return;
      }

      const threshold = 550; // Reveal progress tracks across the last 550px of scroll
      const remainingScroll = totalScrollable - scrollTop;

      if (remainingScroll < threshold) {
        const p = 1 - remainingScroll / threshold;
        setFooterProgress(Math.max(0, Math.min(1, p)));
      } else {
        setFooterProgress(0);
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateFooterProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    let unsubLenis: (() => void) | undefined;
    if (lenisRef.current) {
      unsubLenis = lenisRef.current.on('scroll', handleScroll);
    }

    updateFooterProgress();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (unsubLenis) unsubLenis();
    };
  }, [currentPage]);

  const toggleSound = () => {
    const active = ambientSound.toggle();
    setIsAudioPlaying(active);
  };

  // Synchronize document language, dynamic title with typewriter typing effect, canonical URL, and open graph URLs for SEO
  useEffect(() => {
    document.documentElement.lang = lang;
    let pageTitle = 'Jason — Designer & Software Engineer';
    
    if (currentPage === 'projects') {
      pageTitle = lang === 'id' ? 'Karya & Proyek — Jason' : 'Works & Projects — Jason';
    } else if (currentPage === 'project-detail' && activeProject) {
      pageTitle = `${activeProject.title} — Jason`;
    } else if (currentPage === 'aboutme') {
      pageTitle = lang === 'id' ? 'Tentang Saya — Jason' : 'About Me & Story — Jason';
    } else if (currentPage === 'contact') {
      pageTitle = lang === 'id' ? 'Hubungi Saya — Jason' : 'Get in Touch — Jason';
    } else if (currentPage === 'bio') {
      pageTitle = 'Bio & Links — Jason';
    } else if (currentPage === 'store') {
      pageTitle = 'Digital Store — Jason';
    } else if (currentPage === '404') {
      pageTitle = '404 Not Found — Jason';
    }

    // Typewriter effect on document.title on initial load & page change
    let index = 0;
    let timerId: ReturnType<typeof setInterval> | null = null;

    document.title = '';

    timerId = setInterval(() => {
      index++;
      if (index <= pageTitle.length) {
        document.title = pageTitle.slice(0, index) + (index < pageTitle.length ? ' |' : '');
      } else {
        document.title = pageTitle;
        if (timerId) clearInterval(timerId);
      }
    }, 45);

    // Dynamically update Canonical and OpenGraph URLs to match current live hostname
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      const canonicalEl = document.querySelector('link[rel="canonical"]');
      if (canonicalEl) {
        canonicalEl.setAttribute('href', currentUrl);
      }
      const ogUrlEl = document.querySelector('meta[property="og:url"]');
      if (ogUrlEl) {
        ogUrlEl.setAttribute('content', currentUrl);
      }
      const twitterUrlEl = document.querySelector('meta[name="twitter:url"]');
      if (twitterUrlEl) {
        twitterUrlEl.setAttribute('content', currentUrl);
      }
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [lang, currentPage, activeProject]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && lenisRef.current) {
      lenisRef.current.scrollTo(el, {
        offset: -60,
        duration: 1.6,
        easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      });
    } else if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const t = TRANSLATIONS[lang];
  const baseProjects = getProjectsData(lang);

  const currentProjects: Project[] = useMemo(() => {
    let list: Project[] = [];
    if (firestoreProjects.length > 0) {
      list = firestoreProjects.map((p) => {
        const fallback = baseProjects.find((bp) => bp.id === p.id);
        return {
          ...fallback,
          ...p,
          title: p.title || fallback?.title || p.id,
          category: p.category || fallback?.category || 'Project',
          description: p.description || fallback?.description || '',
          summary: (p as any).summary || fallback?.summary || '',
          imageUrl: p.imageUrl || fallback?.imageUrl || '',
        };
      });
    } else {
      list = baseProjects;
    }

    // Apply any site image settings overrides
    return list.map((p) => {
      if (p.id === 'zylo' && siteSettings?.zyloImage) return { ...p, imageUrl: siteSettings.zyloImage };
      if (p.id === 'trufin' && siteSettings?.trufinImage) return { ...p, imageUrl: siteSettings.trufinImage };
      if (p.id === 'krigstudio' && siteSettings?.krigstudioImage) return { ...p, imageUrl: siteSettings.krigstudioImage };
      return p;
    });
  }, [firestoreProjects, baseProjects, siteSettings]);

  const currentPrinciples = getPrinciplesList(lang);
  const currentPhilosophy = getPhilosophyData(lang);
  const currentServices = getServicesData(lang);
  const currentStats = getStatsData(lang);
  const currentFaq = getFaqData(lang);
  const localizedActiveProject = activeProject ? (currentProjects.find((p) => p.id === activeProject.id) || activeProject) : null;

  return (
    <div id="page-transition-viewport" className="min-h-screen bg-white text-[#121212] font-sans selection:bg-black selection:text-white relative">
      <GsapGlobalAnimator pageKey={`${currentPage}-${activeProject?.id || ''}`} lang={lang} />
      {/* ------------------------------------------------------------- */}
      {/* TOP FLOATING / STICKY HEADER */}
      {/* ------------------------------------------------------------- */}
      <header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between pointer-events-none">
        {/* Left: Spacer to balance language switch button */}
        <div className="flex-1 flex justify-start items-center" />

        {/* Center / Primary: [ ] Morphing Menu Button to Card */}
        <div className="flex justify-center">
          <MorphingMenu
            isOpen={isMenuOpen}
            setIsOpen={setIsMenuOpen}
            lang={lang}
            onSelectLang={setLang}
            isAudioPlaying={isAudioPlaying}
            onToggleAudio={toggleSound}
            onOpenContact={() => {
              navigateTo('contact');
              setIsMenuOpen(false);
            }}
            onOpenStory={() => {
              navigateTo('aboutme');
              setIsMenuOpen(false);
            }}
            onOpenBio={() => {
              navigateTo('bio');
              setIsMenuOpen(false);
            }}
            onOpenStore={() => {
              navigateTo('store');
              setIsMenuOpen(false);
            }}
            onScrollTo={(id) => {
              if (id === 'projects') {
                navigateTo('projects');
              } else if (id === 'home') {
                navigateTo('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                navigateTo('home');
                setTimeout(() => {
                  scrollToSection(id);
                }, 100);
              }
            }}
            menuLabel={t.menu}
          />
        </div>

        {/* Right: Red Language selector badge (Matching Screenshot) */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => {
              uiSfx.playSwitch();
              const languages: Language[] = ['en', 'id', 'de', 'ja'];
              const nextIdx = (languages.indexOf(lang) + 1) % languages.length;
              setLang(languages[nextIdx]);
            }}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-white font-sans text-xs sm:text-[13px] rounded-[8px] sm:rounded-[9px] shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer select-none ${
              lang === 'en' ? 'bg-[#d92338] hover:bg-[#c51c30]' :
              lang === 'id' ? 'bg-emerald-600 hover:bg-emerald-700' :
              lang === 'de' ? 'bg-slate-700 hover:bg-slate-800' :
              'bg-indigo-600 hover:bg-indigo-700'
            }`}
            title={`Language: ${lang}. Click to switch.`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            <span className="font-medium lowercase tracking-tight">{lang}</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT LAYER (SLIDES UP OVER STICKY FOOTER REVEAL) */}
      {/* ------------------------------------------------------------- */}
      <div id="page-transition-content" className={`relative z-10 bg-white min-h-screen ${currentPage === '404' ? 'pb-0 flex flex-col justify-center' : 'pb-16'}`}>
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
          {currentPage === 'home' ? (
            <>
              {/* ------------------------------------------------------------- */}
              {/* HERO SECTION */}
              {/* ------------------------------------------------------------- */}
            <section id="hero" className="relative pt-24 sm:pt-28 pb-8 overflow-hidden mb-12 bg-white">
              <ScrollReveal distance={28} className="bg-white">
                {/* Hero Top Metadata Row (Aligned with center photo width) */}
                <div className="w-64 sm:w-80 md:w-96 mx-auto px-0 flex justify-between items-center text-xs sm:text-[13px] text-zinc-400 font-mono-code mb-8 sm:mb-12">
                  {/* Left: Real-time Clock */}
                  <div className="flex items-center gap-2">
                    <LiveClock />
                  </div>

                  {/* Right: lend an ear (Ambient sound toggle) */}
                  <button
                    onClick={toggleSound}
                    className="group flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                  >
                    <AnimatedSoundWave isPlaying={isAudioPlaying} size={13} />
                    <span>{t.lendAnEar}</span>
                  </button>
                </div>

                {/* Hero Portrait & Infinite Slide Text Container */}
                <div className="relative w-full bg-white flex flex-col items-center justify-center py-6 sm:py-10">
                  
                  {/* Center Avatar Photo matching the reference */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-none bg-[#201d1c] overflow-hidden shadow-2xl relative group border border-zinc-900/10">
                      {/* Photo Image with scroll-triggered shutter reveal & interactive tooltip */}
                      <ImageTooltip isMe={true} lang={lang} className="w-full h-full">
                        <ShutterRevealImage
                          src={siteSettings?.heroImage || "/profile-3.webp"}
                          srcSet={siteSettings?.heroImage ? undefined : "/profile-3-400.webp 400w, /profile-3-600.webp 600w, /profile-3.webp 800w"}
                          sizes="(max-width: 640px) 256px, (max-width: 768px) 320px, 384px"
                          alt="Steward Jason Liuwindra"
                          fetchPriority="high"
                          loading="eager"
                          decoding="async"
                          className="w-full h-full"
                          imgClassName="w-full h-full object-cover object-center grayscale contrast-115 group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      </ImageTooltip>
                    </div>

                    {/* [steward jason liuwindra] caption */}
                    <div className="mt-4 text-[11px] sm:text-xs font-mono-code text-zinc-500 tracking-wide">
                      {t.nameBracket}
                    </div>
                  </div>

                  {/* GIANT INFINITE SLIDE MARQUEE TEXT (Overlays on top of photo with automatic color inversion) */}
                  <div className="absolute w-full top-[42%] sm:top-[44%] -translate-y-1/2 pointer-events-none select-none z-20 overflow-hidden mix-blend-difference">
                    <div className="animate-marquee-infinite flex whitespace-nowrap text-[13vw] sm:text-[14vw] font-bold tracking-tighter text-white leading-none uppercase">
                      <span>{t.marqueeWord}</span>
                      <span>{t.marqueeWord}</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </section>

      {/* ------------------------------------------------------------- */}
      {/* ABOUT / INTRO SECTION */}
      {/* ------------------------------------------------------------- */}
      <section id="about" className="py-12 px-6 sm:px-12 max-w-7xl mx-auto mt-32 sm:mt-48 md:mt-60 mb-12">
        <ScrollReveal distance={28}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
            {/* Left Column: [hey, i'm] [steward jason liuwindra] */}
            <div className="md:col-span-3">
              <div className="space-y-1 font-mono-code text-xs sm:text-[13px] text-zinc-500">
                <div>[{t.heyIm}]</div>
                <div className="text-zinc-800 font-medium">{t.nameBracket}</div>
              </div>
            </div>

            {/* Center Column: Portrait Photo */}
            <div className="md:col-span-4 flex justify-center">
              <div className="w-32 h-44 sm:w-36 sm:h-52 rounded-none bg-zinc-800 overflow-hidden shadow-lg border border-zinc-200">
                <ImageTooltip isMe={true} lang={lang} className="w-full h-full">
                  <ShutterRevealImage
                    src={siteSettings?.aboutImage || "/profile-2.webp"}
                    srcSet={siteSettings?.aboutImage ? undefined : "/profile-2-400.webp 400w, /profile-2.webp 600w"}
                    sizes="(max-width: 640px) 128px, 144px"
                    alt="Steward Jason Liuwindra selfie"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover grayscale contrast-125 hover:scale-105 transition-transform duration-700"
                  />
                </ImageTooltip>
              </div>
            </div>

            {/* Right Column: Statement */}
            <div className="md:col-span-5">
              <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-md">
                {t.introRole}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* SCROLL-LOCKED MY STORY WITH SMOOTH GRAY-TO-BLACK FILL & STABILO HIGHLIGHTER */}
        <AnimatedQuote
          text={t.quoteCenter}
          onOpenStory={() => navigateTo('aboutme')}
          myStoryLabel={t.myStory}
          scrollHintLabel={t.storyScrollHint}
          scrollContinueLabel={t.storyScrollContinue}
        />
      </section>

      {/* ------------------------------------------------------------- */}
      {/* PROJECTS SHOWCASE SECTION (3 CORE PROJECTS) */}
      {/* ------------------------------------------------------------- */}
      <section id="projects" className="py-12 mt-32 sm:mt-48 md:mt-60 mb-12">
        <ScrollReveal distance={28}>
          <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 text-left px-6 sm:px-12 max-w-7xl mx-auto mb-8 sm:mb-12 lowercase tracking-wider">
            {t.selectedWorksLabel || '[selected works]'}
          </div>
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-3">
              {currentProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => {
                    navigateTo('project-detail', undefined, { project });
                  }}
                  className="group cursor-pointer flex flex-col justify-between h-full hover:bg-zinc-100/50 transition-colors"
                >
                  <div className="w-full aspect-[4/3] relative overflow-hidden bg-[#090a0f]">
                    <ImageTooltip tooltip={getProjectTooltipText(project.id, lang)} lang={lang} className="w-full h-full">
                      <ProjectMockup type={project.imageType} imageUrl={project.imageUrl} />
                    </ImageTooltip>
                  </div>
                  <div className="p-4 sm:p-5 space-y-0.5">
                    <div className="text-xs sm:text-[13px] font-medium text-zinc-900 group-hover:underline lowercase flex items-center justify-between">
                      <span>{project.title}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500" />
                    </div>
                    <div className="text-[11px] text-zinc-400 font-normal lowercase">
                      {project.client}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* PRINCIPLES SECTION */}
      {/* ------------------------------------------------------------- */}
      <section id="principles" className="py-12 px-6 sm:px-12 max-w-xl sm:max-w-2xl mx-auto my-12 text-left">
        <ScrollReveal distance={28}>
          <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 mb-6 tracking-wide text-left">
            {t.principlesLabel}
          </div>
          <div className="space-y-3 sm:space-y-4 text-xs sm:text-[13.5px] text-zinc-800 font-normal leading-relaxed text-left">
            {currentPrinciples.map((principle, index) => (
              <div key={index}>
                <EncryptedPrinciple text={principle} lang={lang} />
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* THOUGHT SECTION */}
      {/* ------------------------------------------------------------- */}
      <section id="thought" className="py-12 px-6 sm:px-12 max-w-xl sm:max-w-2xl mx-auto my-12 text-left">
        <ScrollReveal distance={28}>
          <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 mb-6 tracking-wide text-left">
            {t.thoughtLabel}
          </div>

          <div className="space-y-8 text-left">
            <p className="text-xs sm:text-[13px] text-zinc-600 leading-relaxed text-left">
              {t.thoughtIntro}
            </p>

            <div className="space-y-4 pt-4 text-left">
              {currentPhilosophy.map((item) => {
                const isExpanded = expandedThought === item.number;
                return (
                  <div key={item.number} className="border-b border-zinc-100 pb-4 transition-colors">
                    <button
                      onClick={() => setExpandedThought(isExpanded ? '' : item.number)}
                      className="flex items-baseline gap-4 w-full text-left group cursor-pointer py-1"
                      aria-expanded={isExpanded}
                    >
                      <span className={`text-xs sm:text-[13px] font-mono-code transition-colors duration-300 ${
                        isExpanded ? 'text-zinc-900 font-semibold' : 'text-zinc-400 group-hover:text-zinc-800'
                      }`}>
                        {item.number}
                      </span>
                      <span className={`text-lg sm:text-xl font-bold tracking-tight transition-all duration-300 ${
                        isExpanded ? 'text-black translate-x-1' : 'text-zinc-800 group-hover:text-black group-hover:translate-x-0.5'
                      }`}>
                        {item.title}
                      </span>
                    </button>

                    {/* Smooth CSS Grid Accordion Transition */}
                    <div
                      className="grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
                      style={{
                        gridTemplateRows: isExpanded ? '1fr' : '0fr',
                        opacity: isExpanded ? 1 : 0,
                      }}
                    >
                      <div className="min-h-0 pl-8 sm:pl-9 space-y-1.5 pt-2">
                        <p className={`text-xs sm:text-[13px] text-zinc-500 italic transition-all duration-500 delay-75 ${
                          isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                        }`}>
                          {item.headline}
                        </p>
                        <p className={`text-xs sm:text-[12.5px] text-zinc-600 leading-relaxed pt-1 transition-all duration-500 delay-100 ${
                          isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                        }`}>
                          {item.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* CURVED PATH MARQUEE (VISUAL CURATION) */}
      {/* ------------------------------------------------------------- */}
      <ScrollReveal distance={28}>
        <VisualCurationMarquee lang={lang} />
      </ScrollReveal>

      {/* ------------------------------------------------------------- */}
      {/* SERVICES SECTION */}
      {/* ------------------------------------------------------------- */}
      <section id="services" className="py-12 px-6 sm:px-12 max-w-xl sm:max-w-2xl mx-auto my-12 text-left">
        <ScrollReveal distance={28}>
          <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 mb-6 tracking-wide text-left">
            {t.servicesLabel}
          </div>

          <div className="space-y-8 text-left">
            <p className="text-xs sm:text-[13px] text-zinc-600 leading-relaxed text-left">
              {t.servicesIntro}
            </p>

            <div className="space-y-4 pt-4">
              {currentServices.map((service) => {
                const isExpanded = expandedService === service.number;
                return (
                  <div key={service.number} className="border-b border-zinc-100 pb-4 transition-colors">
                    <button
                      onClick={() => setExpandedService(isExpanded ? '' : service.number)}
                      className="flex items-baseline justify-between w-full text-left group cursor-pointer py-1"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-baseline gap-4">
                        <span className={`text-xs sm:text-[13px] font-mono-code transition-colors duration-300 ${
                          isExpanded ? 'text-zinc-900 font-semibold' : 'text-zinc-400 group-hover:text-zinc-800'
                        }`}>
                          {service.number}
                        </span>
                        <span className={`text-lg sm:text-xl font-bold tracking-tight transition-all duration-300 ${
                          isExpanded ? 'text-black translate-x-1' : 'text-zinc-800 group-hover:text-black group-hover:translate-x-0.5'
                        }`}>
                          {service.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono-code text-zinc-400 hidden sm:inline-block">
                        [{service.category}]
                      </span>
                    </button>

                    {/* Smooth CSS Grid Accordion Transition */}
                    <div
                      className="grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
                      style={{
                        gridTemplateRows: isExpanded ? '1fr' : '0fr',
                        opacity: isExpanded ? 1 : 0,
                      }}
                    >
                      <div className="min-h-0 pl-8 sm:pl-9 space-y-3 pt-2">
                        <p className={`text-xs sm:text-[12.5px] text-zinc-600 leading-relaxed transition-all duration-500 delay-75 ${
                          isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                        }`}>
                          {service.description}
                        </p>

                        {/* Deliverables tags */}
                        <div className={`flex flex-wrap gap-2 pt-1 transition-all duration-500 delay-100 ${
                          isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                        }`}>
                          {service.deliverables.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-[11px] font-mono-code text-zinc-700"
                            >
                              <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
                              <span>{item}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4">
              <button
                onClick={() => {
                  navigateTo('contact');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-300 hover:border-zinc-900 bg-white hover:bg-zinc-50 text-zinc-800 hover:text-black text-xs font-medium transition-all shadow-xs active:scale-95 cursor-pointer lowercase"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span>
                <span>{t.discussProject}</span>
              </button>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* STATS & IMPACT IN NUMBERS SECTION */}
      {/* ------------------------------------------------------------- */}
      <section id="stats" className="py-12 px-6 sm:px-12 max-w-xl sm:max-w-2xl mx-auto my-12 text-left">
        <ScrollReveal distance={28}>
          <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 mb-6 tracking-wide text-left">
            {t.statsLabel}
          </div>

          <div className="space-y-8 text-left">
            <p className="text-xs sm:text-[13px] text-zinc-600 leading-relaxed text-left">
              {t.statsIntro}
            </p>

            {/* Stats Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-left">
              {currentStats.map((stat, idx) => (
                <div key={stat.number + stat.label}>
                  <AnimatedStatCard stat={stat} idx={idx} />
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FAQ SECTION */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-12 px-6 sm:px-12 max-w-xl sm:max-w-2xl mx-auto my-12 text-left">
        <ScrollReveal distance={28}>
          <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 mb-6 tracking-wide text-left">
            {t.faqLabel}
          </div>

          <div className="space-y-8 text-left">
            <p className="text-xs sm:text-[13px] text-zinc-600 leading-relaxed text-left">
              {t.faqIntro}
            </p>

            <div className="space-y-4 pt-4 text-left">
              {currentFaq.map((faqItem) => {
                const isExpanded = expandedFaq === faqItem.number;
                return (
                  <div key={faqItem.number} className="border-b border-zinc-100 pb-4 transition-colors">
                    <button
                      onClick={() => {
                        uiSfx.playPop();
                        setExpandedFaq(isExpanded ? '' : faqItem.number);
                      }}
                      className="flex items-baseline justify-between w-full text-left group cursor-pointer py-1"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-baseline gap-4">
                        <span className={`text-xs sm:text-[13px] font-mono-code transition-colors duration-300 ${
                          isExpanded ? 'text-zinc-900 font-semibold' : 'text-zinc-400 group-hover:text-zinc-800'
                        }`}>
                          {faqItem.number}
                        </span>
                        <span className={`text-base sm:text-lg font-bold tracking-tight lowercase transition-all duration-300 ${
                          isExpanded ? 'text-black translate-x-1' : 'text-zinc-800 group-hover:text-black group-hover:translate-x-0.5'
                        }`}>
                          {faqItem.question}
                        </span>
                      </div>
                      <span className={`text-xs font-mono-code transition-transform duration-300 text-zinc-400 ${
                        isExpanded ? 'rotate-90 text-zinc-900 font-bold' : ''
                      }`}>
                        [+]
                      </span>
                    </button>

                    {/* Smooth CSS Grid Accordion Transition */}
                    <div
                      className="grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
                      style={{
                        gridTemplateRows: isExpanded ? '1fr' : '0fr',
                        opacity: isExpanded ? 1 : 0,
                      }}
                    >
                      <div className="min-h-0 pl-8 sm:pl-9 space-y-3 pt-2">
                        <p className={`text-xs sm:text-[12.5px] text-zinc-600 leading-relaxed transition-all duration-500 delay-75 ${
                          isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                        }`}>
                          {faqItem.answer}
                        </p>

                        {faqItem.tags && (
                          <div className={`flex flex-wrap gap-1.5 pt-1 transition-all duration-500 delay-100 ${
                            isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                          }`}>
                            {faqItem.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-mono-code text-zinc-400 lowercase"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Ask the Cloud — Gemini AI Portfolio Assistant (Independent Section Reveal) */}
        <ScrollReveal distance={28}>
          <AskTheCloud lang={lang} />
        </ScrollReveal>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* NOT THE END / EDITORIAL STATEMENT SECTION */}
      {/* ------------------------------------------------------------- */}
      <ScrollReveal distance={28}>
        <section className="py-12 px-6 text-center max-w-2xl mx-auto space-y-7 sm:space-y-9 my-12">
          <div className="text-[12px] sm:text-xs text-zinc-400 font-mono-code lowercase tracking-wider">
            {t.buildTag || '[not the end]'}
          </div>

          <InteractiveBrandName
            shortName={t.buildBrand || 'jason'}
            fullName={t.buildFullName || 'steward jason liuwindra'}
          />

          <div className="space-y-3 pt-2 sm:pt-4">
            <h3 className="text-xl sm:text-2xl md:text-3xl text-zinc-900 font-light tracking-tight leading-snug max-w-md mx-auto lowercase">
              {t.buildHeading}
            </h3>
            <p className="text-xs sm:text-[13px] text-zinc-400 font-light lowercase pt-1">
              {t.buildSub}
            </p>
          </div>
        </section>
      </ScrollReveal>
    </>
  ) : currentPage === 'aboutme' ? (
    <AboutMePage
      lang={lang}
      onBack={() => {
        navigateTo('home');
      }}
      onOpenContact={() => {
        navigateTo('contact');
      }}
      onSeeAllProjects={() => {
        navigateTo('projects');
      }}
      onSelectProject={(project) => {
        navigateTo('project-detail', undefined, { project });
      }}
      siteImages={siteSettings || undefined}
    />
  ) : currentPage === 'projects' ? (
    <ProjectsPage
      lang={lang}
      onBack={() => {
        navigateTo('home');
      }}
      onOpenContact={() => {
        navigateTo('contact');
      }}
      onSelectProject={(project) => {
        navigateTo('project-detail', undefined, { project });
      }}
      customProjects={currentProjects}
    />
  ) : currentPage === 'project-detail' && localizedActiveProject ? (
    <ProjectDetailPage
      project={localizedActiveProject}
      lang={lang}
      onBack={() => {
        navigateTo('projects');
      }}
      onOpenContact={() => {
        navigateTo('contact');
      }}
      onSelectProject={(project) => {
        navigateTo('project-detail', undefined, { project });
      }}
      allProjects={currentProjects}
    />
  ) : currentPage === 'bio' ? (
    <BioPage
      lang={lang}
      onNavigateHome={() => {
        navigateTo('home');
      }}
      onSelectProject={(project) => {
        navigateTo('project-detail', undefined, { project });
      }}
      onOpenContact={() => {
        navigateTo('contact');
      }}
    />
  ) : currentPage === 'store' ? (
    <StorePage
      lang={lang}
      onNavigateHome={() => {
        navigateTo('home');
      }}
    />
  ) : currentPage === '404' ? (
    <NotFoundPage
      lang={lang}
      onNavigateHome={() => {
        navigateTo('home');
      }}
    />
  ) : (
    <ContactPage
      lang={lang}
      onNavigateHome={() => {
        navigateTo('home');
      }}
    />
  )}
</Suspense>
</div>

      {/* ------------------------------------------------------------- */}
      {/* UNIFIED STICKY ANIMATED FOOTER (REVEALED FROM UNDERNEATH) */}
      {/* ------------------------------------------------------------- */}
      {currentPage !== '404' && (
        <Footer
          footerProgress={footerProgress}
          lang={lang}
          onNavigateHome={() => {
            navigateTo('home');
          }}
          onNavigateAboutMe={() => {
            navigateTo('aboutme');
          }}
          onNavigateBio={() => {
            navigateTo('bio');
          }}
          onNavigateStore={() => {
            navigateTo('store');
          }}
          onOpenContact={() => {
            navigateTo('contact');
          }}
          onScrollToProjects={() => {
            navigateTo('projects');
          }}
          onScrollToServices={() => {
            if (currentPage !== 'home') {
              navigateTo('home');
              setTimeout(() => {
                scrollToSection('services');
              }, 120);
            } else {
              scrollToSection('services');
            }
          }}
          onScrollToFaq={() => {
            if (currentPage !== 'home') {
              navigateTo('home');
              setTimeout(() => {
                scrollToSection('faq');
              }, 120);
            } else {
              scrollToSection('faq');
            }
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}
      {isContactOpen && (
        <Suspense fallback={null}>
          <ContactModal
            isOpen={isContactOpen}
            onClose={() => setIsContactOpen(false)}
            lang={lang}
          />
        </Suspense>
      )}

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM BLACK SCROLL PROGRESS BAR */}
      {/* ------------------------------------------------------------- */}
      {currentPage !== '404' && <BottomScrollProgress currentPage={currentPage} />}

      {/* ------------------------------------------------------------- */}
      {/* VIEWPORT ZOOM & VERTICAL SLIDE PAGE TRANSITION OVERLAY */}
      {/* ------------------------------------------------------------- */}
      <CurtainBlindsTransition
        stage={blindsStage}
        targetPageName={transitionTitle}
        lang={lang}
        menuLabel={t.menu}
        onClosed={handleBlindsClosed}
        onOpened={handleBlindsOpened}
      />
    </div>
  );
}
