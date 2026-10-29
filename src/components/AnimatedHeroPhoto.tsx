import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { uiSfx } from '../utils/audio';
import { Language } from '../types';

interface AnimatedHeroPhotoProps {
  heroImage?: string;
  lang?: Language;
  className?: string;
  onPhotoClick?: () => void;
}

type StickerType =
  | 'glasses_green'
  | 'ninja_mask'
  | 'beanie_purple'
  | 'cyber_visor'
  | 'cat_ears'
  | 'emo_bangs'
  | 'thug_shades'
  | 'clean';

interface FrameState {
  photoSrc: string;
  sticker: StickerType;
  label: string;
  rotation?: number;
}

export const AnimatedHeroPhoto: React.FC<AnimatedHeroPhotoProps> = ({
  heroImage,
  lang = 'en',
  className = '',
  onPhotoClick,
}) => {
  // Collection of frames combining profile shots and retro pixel stickers
  const frames: FrameState[] = [
    {
      photoSrc: heroImage || '/profile-3.webp',
      sticker: 'cat_ears',
      label: 'pixel cat ears',
      rotation: -0.5,
    },
    {
      photoSrc: heroImage || '/profile-3.webp',
      sticker: 'cyber_visor',
      label: 'cyber visor',
      rotation: 0.5,
    },
    {
      photoSrc: heroImage || '/profile-3.webp',
      sticker: 'glasses_green',
      label: 'green pixel glasses',
      rotation: 0,
    },
    {
      photoSrc: heroImage || '/profile-3.webp',
      sticker: 'ninja_mask',
      label: 'ninja bandana mask',
      rotation: -1,
    },
    {
      photoSrc: '/profile-2.webp',
      sticker: 'beanie_purple',
      label: 'purple beanie',
      rotation: 0.8,
    },
    {
      photoSrc: '/profile-2.webp',
      sticker: 'emo_bangs',
      label: 'emo pixel bangs',
      rotation: -0.6,
    },
    {
      photoSrc: heroImage || '/profile-3.webp',
      sticker: 'thug_shades',
      label: '8-bit pixel shades',
      rotation: 0.4,
    },
    {
      photoSrc: '/profile.webp',
      sticker: 'ninja_mask',
      label: 'stealth mask',
      rotation: 1,
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-cycle through the frames every 1100ms like in the video
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % frames.length);
    }, 1150);

    return () => clearInterval(timer);
  }, [frames.length]);

  // Click to instantly jump to next sticker
  const handleManualNext = useCallback(() => {
    uiSfx.playSwitch();
    setCurrentIndex((prev) => (prev + 1) % frames.length);
    if (onPhotoClick) onPhotoClick();
  }, [frames.length, onPhotoClick]);

  // Mouse move 3D parallax tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 10, y: -y * 10 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const currentFrame = frames[currentIndex];

  // Translated subquote seen in reference video
  const subQuotes: Record<Language, string> = {
    en: 'out of infinite possibilities, i chose this one.',
    id: 'dari kemungkinan tanpa batas, aku memilih yang ini.',
    de: 'aus unendlichen möglichkeiten wählte ich diese eine.',
    ja: '無限の可能性の中から、これを選んだ。',
  };

  return (
    <div className={`relative z-10 flex flex-col items-center ${className}`}>
      {/* 3D Tilt Wrapper */}
      <div
        ref={containerRef}
        onClick={handleManualNext}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-none bg-[#121214] overflow-hidden shadow-2xl relative group border border-zinc-900/10 cursor-pointer select-none transition-shadow duration-300 hover:shadow-zinc-950/20"
        style={{
          transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
        }}
        title="Click to change sticker"
      >
        {/* Corner viewfinder markers like a camera */}
        <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-white/30 z-30 pointer-events-none" />
        <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-white/30 z-30 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-white/30 z-30 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-white/30 z-30 pointer-events-none" />

        {/* Live snapshot tag */}
        <div className="absolute top-3 left-3 z-30 pointer-events-none flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-mono-code text-white/70 uppercase tracking-wider">
            rec · {currentIndex + 1}/{frames.length}
          </span>
        </div>

        {/* Interactive Click Tip */}
        <div className="absolute bottom-3 right-3 z-30 pointer-events-none opacity-0 group-hover:opacity-80 transition-opacity duration-200 text-[9px] font-mono-code text-white/60 lowercase">
          [click to change]
        </div>

        {/* Image Display with Pop Snap Transition */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`frame-${currentIndex}`}
            initial={{ opacity: 0.9, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1, rotate: currentFrame.rotation || 0 }}
            exit={{ opacity: 0.9, scale: 1.01 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full h-full relative"
          >
            {/* Background Profile Photo */}
            <img
              src={currentFrame.photoSrc}
              alt="Steward Jason Liuwindra"
              className="w-full h-full object-cover object-center contrast-105 select-none pointer-events-none"
              draggable={false}
              loading="eager"
            />

            {/* Retro Pixel Art Sticker Layer */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {renderPixelSticker(currentFrame.sticker)}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Subquote directly matching yeqq.com.tr video */}
      <div className="mt-4 flex flex-col items-center gap-1 text-center">
        <p className="text-[11px] sm:text-xs font-mono-code text-zinc-400 font-normal tracking-tight lowercase">
          {subQuotes[lang] || subQuotes.en}
        </p>
        <span className="text-[10px] sm:text-[11px] font-mono-code text-zinc-400/70 lowercase">
          [steward jason liuwindra]
        </span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Pixel-Art Vector SVG Overlays with Crisp Edges
// -------------------------------------------------------------
function renderPixelSticker(sticker: StickerType) {
  switch (sticker) {
    case 'glasses_green':
      // Neon green pixel shutter shades / 8-bit glasses (exact match with frame 00:02)
      return (
        <svg
          viewBox="0 0 160 50"
          className="w-[72%] absolute top-[36%] left-[14%] drop-shadow-[0_4px_12px_rgba(34,197,94,0.35)] animate-in fade-in zoom-in-95 duration-150"
          style={{ shapeRendering: 'crispEdges' }}
        >
          {/* Outer Black Pixel Border */}
          <rect x="0" y="8" width="68" height="34" fill="#09090b" />
          <rect x="92" y="8" width="68" height="34" fill="#09090b" />
          <rect x="64" y="16" width="32" height="12" fill="#09090b" />
          {/* Green Frame Body */}
          <rect x="4" y="12" width="60" height="26" fill="#22c55e" />
          <rect x="96" y="12" width="60" height="26" fill="#22c55e" />
          <rect x="64" y="18" width="32" height="8" fill="#4ade80" />
          {/* Lenses Interior Dark */}
          <rect x="12" y="18" width="44" height="14" fill="#052e16" />
          <rect x="104" y="18" width="44" height="14" fill="#052e16" />
          {/* Neon Green Horizontal Shutter Slits */}
          <rect x="12" y="21" width="44" height="2" fill="#86efac" />
          <rect x="12" y="26" width="44" height="2" fill="#86efac" />
          <rect x="104" y="21" width="44" height="2" fill="#86efac" />
          <rect x="104" y="26" width="44" height="2" fill="#86efac" />
          {/* Pixel Highlights */}
          <rect x="8" y="14" width="4" height="4" fill="#dcfce7" />
          <rect x="100" y="14" width="4" height="4" fill="#dcfce7" />
        </svg>
      );

    case 'ninja_mask':
      // Black / Charcoal pixel face bandana / mask (exact match with frame 00:03 & 00:07)
      return (
        <svg
          viewBox="0 0 160 120"
          className="w-[78%] absolute top-[48%] left-[11%] drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-150"
          style={{ shapeRendering: 'crispEdges' }}
        >
          {/* Ear Loops / Side Straps */}
          <rect x="4" y="16" width="16" height="8" fill="#18181b" />
          <rect x="140" y="16" width="16" height="8" fill="#18181b" />
          {/* Outer Black Pixel Outline */}
          <polygon
            points="
              20,12 36,12 36,4 52,4 52,12 108,12 108,4 124,4 124,12 140,12 
              148,24 148,48 136,72 116,96 96,112 80,120 64,112 44,96 24,72 12,48 12,24
            "
            fill="#09090b"
          />
          {/* Dark Charcoal Mask Body */}
          <polygon
            points="
              24,16 38,16 38,8 50,8 50,16 110,16 110,8 122,8 122,16 136,16 
              142,26 142,46 132,68 112,92 94,106 80,114 66,106 48,92 28,68 18,46 18,26
            "
            fill="#18181b"
          />
          {/* Inner Shading / Fold Textures */}
          <rect x="36" y="24" width="88" height="8" fill="#27272a" />
          <rect x="44" y="36" width="72" height="8" fill="#27272a" />
          <rect x="52" y="48" width="56" height="8" fill="#27272a" />
          <rect x="60" y="60" width="40" height="8" fill="#27272a" />
          <rect x="68" y="72" width="24" height="8" fill="#27272a" />
          <rect x="74" y="84" width="12" height="8" fill="#3f3f46" />
          {/* Stitch / Contour Accent */}
          <rect x="40" y="32" width="6" height="2" fill="#52525b" />
          <rect x="52" y="32" width="6" height="2" fill="#52525b" />
          <rect x="102" y="32" width="6" height="2" fill="#52525b" />
          <rect x="114" y="32" width="6" height="2" fill="#52525b" />
        </svg>
      );

    case 'beanie_purple':
      // Purple pixel knit beanie / hat (exact match with frame 00:05)
      return (
        <svg
          viewBox="0 0 180 120"
          className="w-[84%] absolute -top-[4%] left-[8%] drop-shadow-[0_8px_20px_rgba(124,58,237,0.4)] animate-in fade-in zoom-in-95 duration-150"
          style={{ shapeRendering: 'crispEdges' }}
        >
          {/* Black Outer Contour */}
          <rect x="30" y="10" width="120" height="70" fill="#09090b" />
          <rect x="45" y="0" width="90" height="20" fill="#09090b" />
          <rect x="18" y="60" width="144" height="42" fill="#09090b" />
          {/* Vivid Purple Beanie Crown */}
          <rect x="34" y="14" width="112" height="50" fill="#7c3aed" />
          <rect x="50" y="4" width="80" height="16" fill="#8b5cf6" />
          {/* Ribbed Fold / Brim */}
          <rect x="22" y="64" width="136" height="34" fill="#6d28d9" />
          {/* Vertical Rib Stripes */}
          <rect x="32" y="64" width="4" height="34" fill="#5b21b6" />
          <rect x="46" y="64" width="4" height="34" fill="#5b21b6" />
          <rect x="60" y="64" width="4" height="34" fill="#5b21b6" />
          <rect x="74" y="64" width="4" height="34" fill="#5b21b6" />
          <rect x="88" y="64" width="4" height="34" fill="#5b21b6" />
          <rect x="102" y="64" width="4" height="34" fill="#5b21b6" />
          <rect x="116" y="64" width="4" height="34" fill="#5b21b6" />
          <rect x="130" y="64" width="4" height="34" fill="#5b21b6" />
          <rect x="144" y="64" width="4" height="34" fill="#5b21b6" />
          {/* Pixel Highlight on the top */}
          <rect x="54" y="8" width="24" height="6" fill="#c4b5fd" />
        </svg>
      );

    case 'cyber_visor':
      // Blue glowing cybernetic visor across eyes (exact match with frame 00:01)
      return (
        <svg
          viewBox="0 0 170 45"
          className="w-[76%] absolute top-[34%] left-[12%] drop-shadow-[0_0_16px_rgba(59,130,246,0.6)] animate-in fade-in zoom-in-95 duration-150"
          style={{ shapeRendering: 'crispEdges' }}
        >
          {/* Black Frame Outline */}
          <rect x="0" y="4" width="170" height="36" fill="#09090b" />
          {/* Deep Blue Base */}
          <rect x="4" y="8" width="162" height="28" fill="#1e40af" />
          {/* Bright Cyan Glass */}
          <rect x="8" y="12" width="154" height="20" fill="#2563eb" />
          {/* Cyan Glowing Horizontal Beam */}
          <rect x="12" y="20" width="146" height="4" fill="#60a5fa" />
          <rect x="60" y="18" width="30" height="8" fill="#93c5fd" />
          <rect x="70" y="16" width="10" height="12" fill="#ffffff" />
          {/* Corner Tech Dots */}
          <rect x="8" y="12" width="4" height="4" fill="#38bdf8" />
          <rect x="158" y="12" width="4" height="4" fill="#38bdf8" />
        </svg>
      );

    case 'cat_ears':
      // Pixel Cat Ears on head (exact match with frame 00:03)
      return (
        <svg
          viewBox="0 0 200 70"
          className="w-[88%] absolute -top-[5%] left-[6%] drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-150"
          style={{ shapeRendering: 'crispEdges' }}
        >
          {/* Left Cat Ear */}
          <rect x="20" y="30" width="40" height="35" fill="#09090b" />
          <rect x="25" y="20" width="30" height="15" fill="#09090b" />
          <rect x="30" y="10" width="20" height="15" fill="#09090b" />
          <rect x="35" y="0" width="10" height="15" fill="#09090b" />
          {/* Left Ear Inner Pink */}
          <rect x="28" y="25" width="24" height="30" fill="#f43f5e" />
          <rect x="32" y="15" width="16" height="15" fill="#fb7185" />
          <rect x="36" y="8" width="8" height="10" fill="#ffe4e6" />

          {/* Right Cat Ear */}
          <rect x="140" y="30" width="40" height="35" fill="#09090b" />
          <rect x="145" y="20" width="30" height="15" fill="#09090b" />
          <rect x="150" y="10" width="20" height="15" fill="#09090b" />
          <rect x="155" y="0" width="10" height="15" fill="#09090b" />
          {/* Right Ear Inner Pink */}
          <rect x="148" y="25" width="24" height="30" fill="#f43f5e" />
          <rect x="152" y="15" width="16" height="15" fill="#fb7185" />
          <rect x="156" y="8" width="8" height="10" fill="#ffe4e6" />
        </svg>
      );

    case 'emo_bangs':
      // Black pixel jagged emo hair fringe (exact match with frame 00:06)
      return (
        <svg
          viewBox="0 0 180 80"
          className="w-[84%] absolute top-[10%] left-[8%] drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-150"
          style={{ shapeRendering: 'crispEdges' }}
        >
          {/* Jagged Pixel Hair Strands */}
          <polygon
            points="
              10,0 170,0 170,25 
              155,48 145,25 
              130,55 120,28 
              105,65 92,30 
              75,70 65,32 
              45,60 35,28 
              20,50 10,25
            "
            fill="#09090b"
          />
          <polygon
            points="
              14,0 166,0 166,20 
              153,42 143,22 
              128,49 118,25 
              103,58 90,26 
              73,63 63,28 
              43,54 33,24 
              18,44 14,20
            "
            fill="#18181b"
          />
          {/* Highlights */}
          <rect x="30" y="8" width="30" height="4" fill="#3f3f46" />
          <rect x="80" y="8" width="40" height="4" fill="#3f3f46" />
          <rect x="135" y="8" width="20" height="4" fill="#3f3f46" />
        </svg>
      );

    case 'thug_shades':
      // Classic 8-bit black thug life shades with stair-step specular glares
      return (
        <svg
          viewBox="0 0 160 40"
          className="w-[70%] absolute top-[36%] left-[15%] drop-shadow-[0_6px_14px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-150"
          style={{ shapeRendering: 'crispEdges' }}
        >
          {/* Black Frames and Bridge */}
          <rect x="0" y="6" width="68" height="28" fill="#000000" />
          <rect x="92" y="6" width="68" height="28" fill="#000000" />
          <rect x="68" y="12" width="24" height="8" fill="#000000" />
          {/* Lenses Interior Dark Charcoal */}
          <rect x="6" y="10" width="56" height="20" fill="#18181b" />
          <rect x="98" y="10" width="56" height="20" fill="#18181b" />
          {/* Left Lens Stair-step Specular Glare */}
          <rect x="10" y="12" width="6" height="6" fill="#ffffff" />
          <rect x="16" y="16" width="6" height="6" fill="#ffffff" />
          <rect x="22" y="20" width="6" height="6" fill="#ffffff" />
          {/* Right Lens Stair-step Specular Glare */}
          <rect x="102" y="12" width="6" height="6" fill="#ffffff" />
          <rect x="108" y="16" width="6" height="6" fill="#ffffff" />
          <rect x="114" y="20" width="6" height="6" fill="#ffffff" />
        </svg>
      );

    case 'clean':
    default:
      return null;
  }
}
