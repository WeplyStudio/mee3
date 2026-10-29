import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '../types';

export const getMeTooltipText = (lang: string = 'en'): string => {
  switch (lang) {
    case 'id':
      return 'hei, ini saya!';
    case 'de':
      return 'hey, das bin ich!';
    case 'ja':
      return 'やあ、僕だよ！';
    case 'en':
    default:
      return "hey, it's me!";
  }
};

export const getLangBgClass = (lang: string = 'en'): string => {
  switch (lang) {
    case 'id':
      return 'bg-emerald-600';
    case 'de':
      return 'bg-slate-700';
    case 'ja':
      return 'bg-indigo-600';
    case 'en':
    default:
      return 'bg-[#d92338]';
  }
};

export const getProjectTooltipText = (projectId: string, lang: string = 'en'): string => {
  const normalizedId = projectId.toLowerCase();

  if (normalizedId.includes('zylo')) {
    switch (lang) {
      case 'id':
        return 'zylo — platform cloud & hosting website';
      case 'de':
        return 'zylo — cloud-hosting & web-plattform';
      case 'ja':
        return 'zylo — 高速Webホスティング';
      case 'en':
      default:
        return 'zylo — cloud hosting & fast platform';
    }
  }

  if (normalizedId.includes('trufin')) {
    switch (lang) {
      case 'id':
        return 'trufin — verifikasi pinjol & fintech resmi';
      case 'de':
        return 'trufin — kredit- & fintech-verifizierung';
      case 'ja':
        return 'trufin — 金融・融資検証プラットフォーム';
      case 'en':
      default:
        return 'trufin — loan & fintech verification';
    }
  }

  if (normalizedId.includes('krigstudio')) {
    switch (lang) {
      case 'id':
        return 'krigstudio — pembuat undangan digital & website acara';
      case 'de':
        return 'krigstudio — digitale einladungen & event-websites';
      case 'ja':
        return 'krigstudio — デジタル招待状クリエイター';
      case 'en':
      default:
        return 'krigstudio — digital invitation creator';
    }
  }

  return projectId;
};

interface ImageTooltipProps {
  tooltip?: string;
  isMe?: boolean;
  lang?: Language;
  children: React.ReactNode;
  className?: string;
}

export const ImageTooltip: React.FC<ImageTooltipProps> = ({
  tooltip,
  isMe,
  lang = 'en',
  children,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const text = isMe ? getMeTooltipText(lang) : tooltip;

  // If no tooltip text specified, render children directly
  if (!text) {
    return <div className={className}>{children}</div>;
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setPos({ x: e.clientX, y: e.clientY });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const bgClass = getLangBgClass(lang);

  // Flip down if close to top edge of browser window
  const isNearTop = pos.y < 55;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
    >
      {children}

      {/* Floating Tooltip matching the language button styling */}
      {mounted &&
        isHovered &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: isNearTop ? 'translate(-50%, 20px)' : 'translate(-50%, -135%)',
              zIndex: 99999999,
              pointerEvents: 'none',
            }}
            className="select-none transition-transform duration-75 ease-out will-change-transform"
          >
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-white font-sans text-xs sm:text-[13px] rounded-[8px] sm:rounded-[9px] shadow-lg whitespace-nowrap transition-colors duration-300 animate-in fade-in zoom-in-95 duration-150 ${bgClass}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse"></span>
              <span className="font-medium lowercase tracking-tight">{text}</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
