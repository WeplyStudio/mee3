import React, { useState, useRef, useEffect } from 'react';
import { Play, ChevronLeft, ChevronRight, X, Link2, Check, Sparkles, ArrowUpRight, Film } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/portfolioData';
import { ScrollReveal } from './ScrollReveal';
import { uiSfx } from '../utils/audio';

export interface VideoStoryItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  description: string;
  accentColor: string;
  driveUrl: string; // Google Drive share URL or direct MP4 URL
  posterImage?: string;
  statsLabel?: string;
  statsValue?: string;
}

interface Props {
  lang: Language;
  customStories?: VideoStoryItem[];
  onStoriesUpdated?: (stories: VideoStoryItem[]) => void;
}

// Helper to convert Google Drive share links into embeddable iframe preview URLs or direct downloads
export function parseVideoUrl(rawUrl: string): { isDrive: boolean; embedUrl: string; directUrl: string; fileId?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isDrive: false, embedUrl: '', directUrl: '' };
  }

  const url = rawUrl.trim();

  // Match Google Drive file ID from URLs like:
  // - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      isDrive: true,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      directUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      fileId,
    };
  }

  return {
    isDrive: false,
    embedUrl: url,
    directUrl: url,
  };
}

// Default video stories styled in high contrast matching the web portfolio
export const DEFAULT_VIDEO_STORIES: VideoStoryItem[] = [
  {
    id: 'story-01',
    title: 'UX/UI Product Interface',
    category: 'Product Interface & Design Systems',
    duration: '0:15',
    description: 'Translating complex user workflows into fluid, human-centered digital products with mathematical typographic rhythm.',
    accentColor: '#3b82f6',
    posterImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    statsLabel: 'Metrics',
    statsValue: '12,552 Active',
  },
  {
    id: 'story-02',
    title: 'Graphic Design & Identity',
    category: 'Branding & Visual Systems',
    duration: '0:24',
    description: 'Tactile brand identities, bespoke typography guidelines, and distinctive visual communication systems.',
    accentColor: '#f97316',
    posterImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
    driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    statsLabel: 'Design Tokens',
    statsValue: 'Brand 3D',
  },
  {
    id: 'story-03',
    title: 'Art Direction & Motion',
    category: '3D Motion & Spatial UI',
    duration: '0:30',
    description: 'Immersive art direction with 3D product viewports, liquid motion transitions, and sensory audio-visual experiences.',
    accentColor: '#10b981',
    posterImage: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80',
    driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    statsLabel: 'Consultation',
    statsValue: '01 Project Support',
  },
  {
    id: 'story-04',
    title: 'Cinematic Motion Reel',
    category: 'High-Retention Motion Stories',
    duration: '0:20',
    description: 'High-impact motion storytelling designed for social reels, showreels, and digital product launches.',
    accentColor: '#8b5cf6',
    posterImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoylikes.mp4',
    statsLabel: 'Framerate',
    statsValue: '60 FPS Motion',
  },
  {
    id: 'story-05',
    title: 'Web Architecture Showcase',
    category: 'Cloud Hosting & Edge CDN',
    duration: '0:18',
    description: 'High-performance cloud hosting dashboard architecture, real-time telemetry gauges, and instant DNS propagation.',
    accentColor: '#0ea5e9',
    posterImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    statsLabel: 'Uptime SLA',
    statsValue: '99.99% Rock Solid',
  },
];

export const VideoStoryCarousel: React.FC<Props> = ({
  lang,
  customStories,
  onStoriesUpdated,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const stories = customStories && customStories.length > 0 ? customStories : DEFAULT_VIDEO_STORIES;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeStory, setActiveStory] = useState<VideoStoryItem | null>(null);
  const [editingUrlStoryId, setEditingUrlStoryId] = useState<string | null>(null);
  const [tempDriveUrl, setTempDriveUrl] = useState<string>('');

  // Drag-to-scroll state
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  // Keyboard escape listener to close popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveStory(null);
        setEditingUrlStoryId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Button navigation scrolling
  const handleScroll = (direction: 'left' | 'right') => {
    try {
      uiSfx.playPop();
    } catch {}
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardWidth = 320; // Scroll per card width
    container.scrollBy({
      left: direction === 'left' ? -cardWidth : cardWidth,
      behavior: 'smooth',
    });
  };

  // Mouse Drag handlers for fluid carousel sliding
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleOpenPopup = (story: VideoStoryItem) => {
    try {
      uiSfx.playSwitch();
    } catch {}
    setActiveStory(story);
    setTempDriveUrl(story.driveUrl || '');
  };

  const handleNextStory = () => {
    if (!activeStory) return;
    const currentIdx = stories.findIndex((s) => s.id === activeStory.id);
    const nextIdx = (currentIdx + 1) % stories.length;
    setActiveStory(stories[nextIdx]);
    setTempDriveUrl(stories[nextIdx].driveUrl || '');
  };

  const handlePrevStory = () => {
    if (!activeStory) return;
    const currentIdx = stories.findIndex((s) => s.id === activeStory.id);
    const prevIdx = (currentIdx - 1 + stories.length) % stories.length;
    setActiveStory(stories[prevIdx]);
    setTempDriveUrl(stories[prevIdx].driveUrl || '');
  };

  const handleSaveDriveUrl = (storyId: string) => {
    if (!tempDriveUrl.trim()) return;
    const updated = stories.map((s) => {
      if (s.id === storyId) {
        return { ...s, driveUrl: tempDriveUrl.trim() };
      }
      return s;
    });

    if (onStoriesUpdated) {
      onStoriesUpdated(updated);
    }

    if (activeStory && activeStory.id === storyId) {
      setActiveStory({ ...activeStory, driveUrl: tempDriveUrl.trim() });
    }

    setEditingUrlStoryId(null);
  };

  return (
    <section id="activities" className="py-24 sm:py-32 md:py-36 bg-white text-zinc-900 relative overflow-hidden select-none my-12 border-t border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        {/* Header matching user's requested layout with top left-aligned title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-14 gap-6 text-left">
          <div className="space-y-3 max-w-xl text-left">
            <ScrollReveal delay={100} distance={20}>
              <span className="text-[11px] font-mono-code text-zinc-400 lowercase tracking-widest block text-left">
                {t.videoStoriesLabel || '[types of activities]'}
              </span>
            </ScrollReveal>
            <ScrollReveal delay={150} distance={20}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight leading-none lowercase text-left">
                {t.videoStoriesTitle || 'what we do'}
              </h2>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={200} distance={20}>
            <p className="text-xs sm:text-[13px] text-zinc-500 leading-relaxed max-w-md lowercase text-left">
              {t.videoStoriesIntro ||
                'we pride ourselves on our ability to craft digital products that not only meet but exceed the expectations of our clients.'}
            </p>
          </ScrollReveal>
        </div>

        {/* Carousel Container */}
        <div className="relative group/carousel">
          <ScrollReveal delay={250} distance={30}>
            <div
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className={`flex gap-5 sm:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory py-4 px-1 cursor-grab active:cursor-grabbing scroll-smooth ${
                isMouseDown ? 'select-none' : ''
              }`}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {stories.map((story) => {
                const videoInfo = parseVideoUrl(story.driveUrl);
                return (
                  <div key={story.id} className="snap-start shrink-0">
                    <div
                      onClick={() => {
                        if (!isMouseDown) handleOpenPopup(story);
                      }}
                      className="group/card w-72 sm:w-80 md:w-84 bg-white border border-zinc-200/90 hover:border-zinc-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                    >
                      {/* Top Thumbnail Image Area */}
                      <div className="w-full aspect-[16/10] bg-zinc-100 relative overflow-hidden border-b border-zinc-100">
                        {story.posterImage ? (
                          <img
                            src={story.posterImage}
                            alt={story.title}
                            className="w-full h-full object-cover grayscale contrast-105 group-hover/card:scale-105 transition-transform duration-700"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                            <Film size={28} />
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="w-11 h-11 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-lg group-hover/card:scale-110 transition-transform">
                            <Play size={18} className="fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Duration & Drive Badge */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono-code text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>{story.duration}</span>
                          </span>

                          {videoInfo.isDrive && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-mono-code text-zinc-800 font-semibold shadow-xs">
                              <Link2 size={10} />
                              <span>drive</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-5 space-y-3 text-left">
                        <div className="space-y-1">
                          <div className="text-[11px] font-mono-code text-zinc-400 lowercase">
                            {story.category}
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-zinc-900 group-hover/card:underline tracking-tight lowercase flex items-center justify-between gap-2">
                            <span>{story.title}</span>
                            <ArrowUpRight size={15} className="opacity-0 group-hover/card:opacity-100 transition-opacity text-zinc-500 shrink-0" />
                          </h3>
                        </div>

                        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 font-normal lowercase">
                          {story.description}
                        </p>

                        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                          <span className="text-[11px] font-mono-code text-zinc-400 lowercase">
                            {story.statsValue || story.statsLabel || 'video story'}
                          </span>

                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-zinc-300 group-hover/card:border-zinc-900 bg-white group-hover/card:bg-zinc-900 text-zinc-800 group-hover/card:text-white text-[11px] font-mono-code transition-all cursor-pointer lowercase"
                          >
                            <span>• watch reel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>

          {/* Bottom Controls Bar matching web style */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-zinc-200/80">
            {/* Left/Right Round Navigation Buttons matching website buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleScroll('left')}
                className="w-10 h-10 rounded-full border border-zinc-300 hover:border-zinc-900 bg-white hover:bg-zinc-50 text-zinc-800 hover:text-black flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                aria-label="Previous stories"
                title="Scroll left"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={() => handleScroll('right')}
                className="w-10 h-10 rounded-full border border-zinc-300 hover:border-zinc-900 bg-white hover:bg-zinc-50 text-zinc-800 hover:text-black flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                aria-label="Next stories"
                title="Scroll right"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Right quote description matching web typography */}
            <div className="text-xs sm:text-[13px] text-zinc-500 font-mono-code max-w-lg text-left sm:text-right leading-relaxed lowercase">
              we pride ourselves on our ability to craft digital products & motion stories that not only meet but exceed expectations.
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* VIDEO POPUP MODAL (LIGHT CLEAN MINIMALIST DESIGN) */}
      {/* ============================================================= */}
      {activeStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80 backdrop-blur-md">
              <div className="flex items-center gap-3 text-left">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: activeStory.accentColor || '#3b82f6' }}
                ></span>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight lowercase">{activeStory.title}</h4>
                  <div className="text-[11px] font-mono-code text-zinc-500 lowercase">{activeStory.category}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Edit Drive Link Toggle */}
                <button
                  onClick={() => setEditingUrlStoryId(editingUrlStoryId ? null : activeStory.id)}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-zinc-100 text-xs font-mono-code text-zinc-700 border border-zinc-300 hover:border-zinc-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs lowercase"
                  title="Configure Google Drive Video Link"
                >
                  <Link2 size={12} />
                  <span>set drive link</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setActiveStory(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center justify-center transition-colors cursor-pointer border border-zinc-200"
                  title="Close popup"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Optional Inline Google Drive Link Config Bar */}
            {editingUrlStoryId === activeStory.id && (
              <div className="p-4 bg-zinc-50 border-b border-zinc-200 space-y-2 animate-in slide-in-from-top duration-300 text-left">
                <div className="flex items-center justify-between text-xs font-mono-code text-zinc-700">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Paste your Google Drive Share Link here:</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">e.g. https://drive.google.com/file/d/FILE_ID/view</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={tempDriveUrl}
                    onChange={(e) => setTempDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/123456789/view?usp=sharing"
                    className="flex-1 bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono-code text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                  <button
                    onClick={() => handleSaveDriveUrl(activeStory.id)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-mono-code font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs lowercase"
                  >
                    <Check size={14} />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            )}

            {/* Video Player Display Area */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
              {(() => {
                const info = parseVideoUrl(activeStory.driveUrl);

                if (info.isDrive) {
                  return (
                    <iframe
                      src={info.embedUrl}
                      title={activeStory.title}
                      className="w-full h-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }

                return (
                  <video
                    src={activeStory.driveUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support video playback.
                  </video>
                );
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-6 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200">
              <p className="text-xs text-zinc-600 leading-relaxed max-w-xl font-normal lowercase text-left">
                {activeStory.description}
              </p>

              {/* Prev / Next Switcher */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrevStory}
                  className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-mono-code text-zinc-800 transition-colors flex items-center gap-1 cursor-pointer border border-zinc-200 lowercase"
                >
                  <ChevronLeft size={14} />
                  <span>prev</span>
                </button>

                <button
                  onClick={handleNextStory}
                  className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-mono-code text-zinc-800 transition-colors flex items-center gap-1 cursor-pointer border border-zinc-200 lowercase"
                >
                  <span>next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
