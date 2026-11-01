import React, { useState, useEffect } from 'react';
import { Project, Language } from '../types';
import { ScrollReveal } from './ScrollReveal';
import { ArrowLeft, ArrowRight, ArrowUpRight, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { uiSfx } from '../utils/audio';

interface Props {
  project: Project;
  lang: Language;
  onBack: () => void;
  onOpenContact: () => void;
  onSelectProject: (project: Project) => void;
  allProjects: Project[];
}

interface ScreenItem {
  id: string;
  title: string;
  caption?: string;
  imageUrl: string;
  fallbackUrl?: string;
}

const getProjectScreens = (project: Project, lang: Language): ScreenItem[] => {
  const isZylo = project.id === 'zylo' || project.imageType === 'zylo';
  const isTrufin = project.id === 'trufin' || project.imageType === 'trufin';
  const isKrig = project.id === 'krigstudio' || project.imageType === 'krigstudio';

  if (isZylo) {
    return [
      {
        id: 'zylo-1',
        title: lang === 'id' ? 'Cari & Cek Nama Domain' : 'Domain Search & Availability',
        caption: lang === 'id' ? 'Temukan nama domain sempurna Anda dengan saran cerdas instan' : 'Find and check domain availability with real-time suggestions',
        imageUrl: '/zylo1.png',
        fallbackUrl: '/zylo.png',
      },
      {
        id: 'zylo-2',
        title: lang === 'id' ? 'Paket Hosting Fleksibel' : 'Hosting Plans & Pricing Matrix',
        caption: lang === 'id' ? 'Paket bulanan dan tahunan hemat dengan jaminan uang kembali 30 hari' : 'Flexible monthly & annual plans with SSD storage & bandwidth gauges',
        imageUrl: '/zylo2.png',
        fallbackUrl: '/zylo.webp',
      },
      {
        id: 'zylo-3',
        title: lang === 'id' ? 'Pusat Konversi & Peluncuran' : 'Conversion & Launch Center',
        caption: lang === 'id' ? 'Bikin online makin keren dengan setup instan dan navigasi terpadu' : 'Seamless onboarding CTA, customer quick links, and platform SLA',
        imageUrl: '/zylo3.png',
        fallbackUrl: '/zylo-900.webp',
      },
      {
        id: 'zylo-4',
        title: lang === 'id' ? 'Dasbor Infrastruktur Cloud' : 'High-Performance Cloud Console',
        caption: lang === 'id' ? 'Status kluster server live, pemantau kapasitas, dan throughput' : 'Live server cluster instances, CPU telemetry, and throughput',
        imageUrl: '/zylo.png',
        fallbackUrl: '/zylo1.png',
      },
    ];
  }

  if (isTrufin) {
    return [
      {
        id: 'trufin-1',
        title: lang === 'id' ? 'Pusat Verifikasi Instansi' : 'Institution Verification Hub',
        caption: lang === 'id' ? 'Pencarian instan instansi keuangan, lisensi resmi, dan tingkat risiko' : 'Instant fuzzy search for financial entities, license numbers, and risk score',
        imageUrl: '/trufin1.png',
        fallbackUrl: '/trufin.png',
      },
      {
        id: 'trufin-2',
        title: lang === 'id' ? 'Radar Pinjol & Fintech Resmi' : 'Fintech & Pinjol Radar',
        caption: lang === 'id' ? 'Perbandingan entitas terdaftar legal vs pinjol ilegal berisiko tinggi' : 'Side-by-side comparison of authorized vs suspicious predatory platforms',
        imageUrl: '/trufin2.png',
        fallbackUrl: '/trufin.webp',
      },
      {
        id: 'trufin-3',
        title: lang === 'id' ? 'Matriks Penilaian Risiko Finansial' : 'Risk Scoring & Regulatory Matrix',
        caption: lang === 'id' ? 'Audit kepatuhan regulasi finansial dan transparansi publik' : 'Automated regulatory cross-referencing and corporate licensing audit',
        imageUrl: '/trufin3.png',
        fallbackUrl: '/trufin-900.webp',
      },
      {
        id: 'trufin-4',
        title: lang === 'id' ? 'Katalog Penipuan & Laporan Publik' : 'Scam Watchlist & Reporting Hub',
        caption: lang === 'id' ? 'Lebih dari 50.000 tautan mencurigakan berhasil dicegah dan dikatalogkan' : 'Over 50,000 flagged scam links, clone apps, and predatory contacts',
        imageUrl: '/trufin4.png',
        fallbackUrl: '/trufin-600.webp',
      },
    ];
  }

  if (isKrig) {
    return [
      {
        id: 'krig-1',
        title: lang === 'id' ? 'Kanvas Undangan Interaktif' : 'Interactive Invitation Canvas',
        caption: lang === 'id' ? 'Sampul eksklusif, linimasa kisah cinta beranimasi, dan hitung mundur' : 'Custom cover reveal, animated couple narrative, and live countdown',
        imageUrl: '/krig1.png',
        fallbackUrl: '/krigstudio.png',
      },
      {
        id: 'krig-2',
        title: lang === 'id' ? 'Buku Tamu RSVP & Ucapan' : 'Dynamic RSVP & Guest Ledger',
        caption: lang === 'id' ? 'Konfirmasi kehadiran seketika dan catatan doa restu tamu' : 'Instant attendance tracking, live prayers, and headcount analytics',
        imageUrl: '/krig2.png',
        fallbackUrl: '/krigstudio.webp',
      },
      {
        id: 'krig-3',
        title: lang === 'id' ? 'Palet Desain Editorial & Tipografi' : 'Editorial Typographic Palette',
        caption: lang === 'id' ? 'Tata letak elegan minimalis berstandar desain internasional' : 'Luxury editorial aesthetic with refined typography and photo sliders',
        imageUrl: '/krig3.png',
        fallbackUrl: '/krigstudio-900.webp',
      },
      {
        id: 'krig-4',
        title: lang === 'id' ? 'Audio Spasial & Peta Lokasi' : 'Spatial Audio & Venue Maps',
        caption: lang === 'id' ? 'Musik latar terkurasi dipadu panduan rute Google Maps langsung' : 'Curated ambient soundtrack coupled with seamless Google Maps routing',
        imageUrl: '/krig4.png',
        fallbackUrl: '/krigstudio-600.webp',
      },
      {
        id: 'krig-5',
        title: lang === 'id' ? 'Amplop Digital & Registri Kado' : 'Digital Envelope & QR Registry',
        caption: lang === 'id' ? 'Kemudahan pengiriman kado via dompet digital dan transfer perbankan' : 'Integrated e-wallet payment QR codes and automated wedding gift registry',
        imageUrl: '/krig5.png',
        fallbackUrl: '/krigstudio.png',
      },
      {
        id: 'krig-6',
        title: lang === 'id' ? 'Galeri Foto Memori 60 FPS' : 'High-Fidelity Photo Gallery',
        caption: lang === 'id' ? 'Pemuatan gambar ultra-cepat tanpa kompresi berlebih' : 'Smooth photo book transitions optimized for desktop and mobile displays',
        imageUrl: '/krig6.png',
        fallbackUrl: '/krigstudio.webp',
      },
    ];
  }

  // Fallback for custom or newly added projects
  const baseImg = project.imageUrl || `/${project.imageType}.webp`;
  return [
    { id: 'screen-1', title: project.title, caption: project.summary, imageUrl: baseImg },
    { id: 'screen-2', title: 'Interface Detail', caption: project.description, imageUrl: baseImg },
    { id: 'screen-3', title: 'System Architecture', caption: project.role, imageUrl: baseImg },
    { id: 'screen-4', title: 'Production Metric', caption: project.tech, imageUrl: baseImg },
    { id: 'screen-5', title: 'User Experience Flow', caption: project.category, imageUrl: baseImg },
  ];
};

export const ProjectDetailPage: React.FC<Props> = ({
  project,
  lang,
  onBack,
  onOpenContact,
  onSelectProject,
  allProjects,
}) => {
  const [selectedScreenIndex, setSelectedScreenIndex] = useState<number | null>(null);

  // Scroll to top on project load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [project.id]);

  const labels = {
    id: {
      company: '[perusahaan]',
      role: '[peran]',
      type: '[tipe]',
      tech: '[teknologi]',
      problem: '[latar belakang & masalah]',
      decisions: '[solusi & keputusan]',
      challenge: '[tantangan teknis]',
      impact: '[dampak]',
      achievements: '[pencapaian]',
      screens: '[screens]',
      backToWorks: '• kembali ke karya',
      clickToZoom: 'klik untuk memperbesar',
      nextWork: 'karya selanjutnya •',
      close: 'tutup',
      screenCount: 'tampilan layar',
    },
    en: {
      company: '[company]',
      role: '[role]',
      type: '[type]',
      tech: '[tech]',
      problem: '[problem & background]',
      decisions: '[solutions & decisions]',
      challenge: '[technical challenge]',
      impact: '[impact]',
      achievements: '[achievements]',
      screens: '[screens]',
      backToWorks: '• back to works',
      clickToZoom: 'click to zoom screen',
      nextWork: 'next work •',
      close: 'close',
      screenCount: 'screens',
    },
    de: {
      company: '[unternehmen]',
      role: '[rolle]',
      type: '[typ]',
      tech: '[technologie]',
      problem: '[problem & hintergrund]',
      decisions: '[lösungen & entscheidungen]',
      challenge: '[technische herausforderung]',
      impact: '[wirkung]',
      achievements: '[erfolge]',
      screens: '[screens]',
      backToWorks: '• zurück zu den werken',
      clickToZoom: 'klicken zum vergrößern',
      nextWork: 'nächstes werk •',
      close: 'schließen',
      screenCount: 'ansichten',
    },
    ja: {
      company: '[クライアント]',
      role: '[担当領域]',
      type: '[カテゴリ]',
      tech: '[技術スタック]',
      problem: '[背景と課題]',
      decisions: '[設計方針と解決策]',
      challenge: '[技術的挑戦]',
      impact: '[成果・影響]',
      achievements: '[主要実績]',
      screens: '[screens]',
      backToWorks: '• 実績一覧へ戻る',
      clickToZoom: 'クリックして拡大',
      nextWork: '次の実績 •',
      close: '閉じる',
      screenCount: '画面プレビュー',
    },
  };

  const l = labels[lang] || labels.en;
  const nextProject = allProjects.find((p) => p.id === project.nextProjectId) || allProjects[0];
  const screenItems = getProjectScreens(project, lang);

  const openLightbox = (index: number) => {
    try {
      uiSfx.playClick();
    } catch {}
    setSelectedScreenIndex(index);
  };

  const closeLightbox = () => {
    try {
      uiSfx.playClick();
    } catch {}
    setSelectedScreenIndex(null);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      uiSfx.playClick();
    } catch {}
    setSelectedScreenIndex((prev) => (prev !== null ? (prev - 1 + screenItems.length) % screenItems.length : 0));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      uiSfx.playClick();
    } catch {}
    setSelectedScreenIndex((prev) => (prev !== null ? (prev + 1) % screenItems.length : 0));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedScreenIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedScreenIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setSelectedScreenIndex((prev) => (prev !== null ? (prev - 1 + screenItems.length) % screenItems.length : 0));
      } else if (e.key === 'ArrowRight') {
        setSelectedScreenIndex((prev) => (prev !== null ? (prev + 1) % screenItems.length : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedScreenIndex, screenItems.length]);

  const activeScreen = selectedScreenIndex !== null ? screenItems[selectedScreenIndex] : null;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white pt-24 sm:pt-32">
      <main className="max-w-5xl mx-auto px-6 sm:px-12 space-y-16 sm:space-y-24 pb-20">
        {/* ------------------------------------------------------------- */}
        {/* HERO: Project Title & Summary */}
        {/* ------------------------------------------------------------- */}
        <section className="space-y-6">
          <ScrollReveal delay={50} distance={20}>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 leading-[1.1] lowercase">
              {project.title}
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={100} distance={20}>
            <p className="text-xs sm:text-[13.5px] text-zinc-600 leading-relaxed max-w-3xl font-normal lowercase">
              {project.summary || project.description}
            </p>
          </ScrollReveal>

          {/* Live Website Button */}
          {project.liveUrl && (
            <ScrollReveal delay={120} distance={15}>
              <div className="pt-2 flex items-center gap-3">
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-white font-sans text-xs sm:text-[13px] rounded-[8px] sm:rounded-[9px] shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer select-none bg-zinc-800 hover:bg-black active:scale-95"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="font-medium lowercase">{project.liveUrl.replace(/^https?:\/\//, '')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 ml-0.5" />
                </a>
              </div>
            </ScrollReveal>
          )}

          {/* 4 Metadata Columns */}
          <ScrollReveal delay={150} distance={20}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 sm:pt-10">
              <div className="space-y-1">
                <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                  {l.company}
                </div>
                <div className="text-xs sm:text-[13px] font-medium text-zinc-900 lowercase">
                  {project.company || project.client}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                  {l.role}
                </div>
                <div className="text-xs sm:text-[13px] font-medium text-zinc-900 lowercase">
                  {project.role}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                  {l.type}
                </div>
                <div className="text-xs sm:text-[13px] font-medium text-zinc-900 lowercase">
                  {project.type || project.category}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                  {l.tech}
                </div>
                <div className="text-xs sm:text-[13px] font-mono-code text-zinc-800 lowercase">
                  {project.tech}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* NARRATIVE SECTIONS: Problem, Decisions, Challenge, Impact */}
        {/* ------------------------------------------------------------- */}
        <section className="space-y-12 sm:space-y-16 pt-12 sm:pt-16">
          {/* [problem] */}
          <ScrollReveal delay={100} distance={20}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-16 items-start">
              <div className="md:col-span-3 text-xs sm:text-[13px] font-mono-code text-zinc-400 lowercase">
                {l.problem}
              </div>
              <div className="md:col-span-9 text-xs sm:text-[13px] text-zinc-700 leading-relaxed max-w-2xl">
                {project.problem}
              </div>
            </div>
          </ScrollReveal>

          {/* [decisions] */}
          <ScrollReveal delay={150} distance={20}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-16 items-start">
              <div className="md:col-span-3 text-xs sm:text-[13px] font-mono-code text-zinc-400 lowercase">
                {l.decisions}
              </div>
              <div className="md:col-span-9 text-xs sm:text-[13px] text-zinc-700 leading-relaxed max-w-2xl">
                {project.decisions}
              </div>
            </div>
          </ScrollReveal>

          {/* [challenge] */}
          {project.challenge && (
            <ScrollReveal delay={175} distance={20}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-16 items-start">
                <div className="md:col-span-3 text-xs sm:text-[13px] font-mono-code text-zinc-400 lowercase">
                  {l.challenge}
                </div>
                <div className="md:col-span-9 text-xs sm:text-[13px] text-zinc-700 leading-relaxed max-w-2xl">
                  {project.challenge}
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* [impact] */}
          <ScrollReveal delay={200} distance={20}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-16 items-start">
              <div className="md:col-span-3 text-xs sm:text-[13px] font-mono-code text-zinc-400 lowercase">
                {l.impact}
              </div>
              <div className="md:col-span-9 text-xs sm:text-[13px] text-zinc-700 leading-relaxed max-w-2xl">
                {project.impact}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* ACHIEVEMENTS / IMPACT METRICS */}
        {/* ------------------------------------------------------------- */}
        <section className="pt-12 sm:pt-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-start">
            <div className="md:col-span-3">
              <ScrollReveal delay={100} distance={20}>
                <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 lowercase">
                  {l.achievements}
                </div>
              </ScrollReveal>
            </div>

            <div className="md:col-span-9 space-y-10 sm:space-y-12">
              {project.achievements.map((item, idx) => (
                <ScrollReveal key={item.number + item.title} delay={idx * 100} distance={25}>
                  <div className="space-y-2 group">
                    <div className="text-4xl sm:text-5xl font-black text-zinc-900 tracking-tight font-mono-code">
                      {item.number}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-zinc-900 lowercase">
                        {item.title}
                      </div>
                      <p className="text-xs sm:text-[12.5px] text-zinc-500 leading-relaxed max-w-xl lowercase">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* SCREENS SHOWCASE GALLERY (MATCHING REFERENCE SCREENSHOT) */}
        {/* ------------------------------------------------------------- */}
        <section className="pt-12 sm:pt-16 space-y-6">
          <ScrollReveal delay={100} distance={20}>
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 lowercase tracking-wider">
                {l.screens}
              </div>
              <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                [{screenItems.length} {l.screenCount}]
              </div>
            </div>
          </ScrollReveal>

          {/* 5-column responsive grid matching the reference screenshot */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {screenItems.map((screen, idx) => (
              <ScrollReveal key={screen.id} delay={idx * 40} distance={15}>
                <div
                  onClick={() => openLightbox(idx)}
                  className="group relative cursor-zoom-in rounded-xl overflow-hidden bg-[#eef0f3] hover:bg-[#e6e9ed] border border-zinc-200/80 hover:border-zinc-400 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 p-2 sm:p-2.5 flex flex-col justify-center items-center aspect-[4/3] sm:aspect-[16/11] select-none"
                  title={`${screen.title} - ${l.clickToZoom}`}
                >
                  {/* Inner Screen Preview Frame */}
                  <div className="w-full h-full relative overflow-hidden rounded-lg bg-white shadow-2xs flex items-center justify-center">
                    <img
                      src={screen.imageUrl}
                      alt={screen.title}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        if (screen.fallbackUrl && e.currentTarget.src !== screen.fallbackUrl) {
                          e.currentTarget.src = screen.fallbackUrl;
                        }
                      }}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </div>

                  {/* Hover Floating Zoom Badge */}
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] text-white font-mono-code opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-md pointer-events-none">
                    <Maximize2 className="w-2.5 h-2.5" />
                    <span>zoom</span>
                  </div>

                  {/* Corner Index Tag */}
                  <div className="absolute bottom-2.5 left-2.5 text-[9px] font-mono-code text-zinc-600 bg-white/85 backdrop-blur-xs px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xs">
                    [{String(idx + 1).padStart(2, '0')}]
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM NAVIGATION: Back to works & Next Project */}
        {/* ------------------------------------------------------------- */}
        <section className="pt-12 sm:pt-16 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-zinc-100">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-xs sm:text-[13px] font-mono-code text-zinc-600 hover:text-black transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>{l.backToWorks}</span>
          </button>

          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-white font-sans text-xs sm:text-[13px] rounded-[8px] sm:rounded-[9px] shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer select-none bg-zinc-800 hover:bg-black active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="font-medium lowercase">{project.liveUrl.replace(/^https?:\/\//, '')}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 ml-0.5" />
            </a>
          )}

          {nextProject && (
            <button
              onClick={() => onSelectProject(nextProject)}
              className="group flex items-center gap-2 text-xs sm:text-[13px] font-mono-code text-zinc-800 hover:text-black font-semibold transition-colors cursor-pointer text-right"
            >
              <span className="truncate max-w-[280px] sm:max-w-none">{nextProject.title}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          )}
        </section>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* FULLSCREEN LIGHTBOX MODAL WITH MULTI-SCREEN BROWSING */}
      {/* ------------------------------------------------------------- */}
      {selectedScreenIndex !== null && activeScreen && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-in fade-in duration-200 select-none cursor-zoom-out"
        >
          {/* Top Bar: Title, Index & Close */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl mx-auto flex items-center justify-between text-xs font-mono-code text-zinc-400 pb-2 border-b border-zinc-800/80 cursor-default"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-white font-bold uppercase tracking-wider">
                [screens]
              </span>
              <span>•</span>
              <span className="text-zinc-300 truncate max-w-[180px] sm:max-w-md">
                {activeScreen.title}
              </span>
              <span className="text-zinc-500">
                [{selectedScreenIndex + 1} / {screenItems.length}]
              </span>
            </div>

            <button
              onClick={closeLightbox}
              className="p-1.5 sm:p-2 rounded-full bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
              title={`${l.close} (Esc)`}
            >
              <span className="text-[10px] hidden sm:inline uppercase tracking-wider">esc</span>
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Middle Stage: Image & Navigation Arrows */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl mx-auto flex-1 flex items-center justify-center p-2 sm:p-4 cursor-default"
          >
            {/* Previous Screen Button */}
            <button
              onClick={handlePrev}
              className="absolute left-1 sm:left-2 z-30 p-2 sm:p-3 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-white transition-all hover:scale-110 active:scale-95 border border-zinc-800 shadow-xl cursor-pointer"
              title="Previous screen (←)"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* High-Res Screen Preview */}
            <div className="w-full h-full flex items-center justify-center max-h-[72vh] sm:max-h-[76vh]">
              <img
                key={activeScreen.id}
                src={activeScreen.imageUrl}
                alt={activeScreen.title}
                loading="eager"
                onError={(e) => {
                  if (activeScreen.fallbackUrl && e.currentTarget.src !== activeScreen.fallbackUrl) {
                    e.currentTarget.src = activeScreen.fallbackUrl;
                  }
                }}
                className="w-auto h-auto max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-zinc-800/80 animate-in zoom-in-95 duration-200"
              />
            </div>

            {/* Next Screen Button */}
            <button
              onClick={handleNext}
              className="absolute right-1 sm:right-2 z-30 p-2 sm:p-3 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-white transition-all hover:scale-110 active:scale-95 border border-zinc-800 shadow-xl cursor-pointer"
              title="Next screen (→)"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Bottom Bar: Caption & Mini Thumbnails Strip */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl mx-auto pt-3 border-t border-zinc-800/80 space-y-3 cursor-default"
          >
            {activeScreen.caption && (
              <div className="text-center text-[11px] sm:text-xs text-zinc-400 font-mono-code lowercase max-w-xl mx-auto leading-relaxed truncate">
                {activeScreen.caption}
              </div>
            )}

            {/* Mini Thumbnails Strip */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 px-2 no-scrollbar">
              {screenItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    try {
                      uiSfx.playClick();
                    } catch {}
                    setSelectedScreenIndex(idx);
                  }}
                  className={`w-12 sm:w-16 h-8 sm:h-10 rounded-md overflow-hidden border transition-all shrink-0 cursor-pointer ${
                    selectedScreenIndex === idx
                      ? 'border-white scale-105 shadow-md ring-1 ring-white/50 opacity-100'
                      : 'border-zinc-800 opacity-40 hover:opacity-80 hover:border-zinc-600'
                  }`}
                  title={item.title}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    onError={(e) => {
                      if (item.fallbackUrl && e.currentTarget.src !== item.fallbackUrl) {
                        e.currentTarget.src = item.fallbackUrl;
                      }
                    }}
                    className="w-full h-full object-cover object-top"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
