import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { uiSfx } from '../utils/audio';

interface InteractiveBrandNameProps {
  shortName?: string;
  fullName?: string;
  className?: string;
}

export const InteractiveBrandName: React.FC<InteractiveBrandNameProps> = ({
  shortName = 'jason',
  fullName = 'steward jason liuwindra',
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isToggled, setIsToggled] = useState<boolean>(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window === 'undefined') return;
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      const isNarrow = window.innerWidth <= 1024;
      const noHover = !window.matchMedia('(hover: hover)').matches;
      setIsMobileOrTablet(Boolean(isCoarse || hasTouch || isNarrow || noHover));
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // On mobile or tablet, state is toggled on press (tap to expand, tap again to collapse)
  // On desktop, state changes purely on cursor hover (no click needed)
  const isExpanded = isMobileOrTablet ? isToggled : isHovered;
  const currentText = isExpanded ? fullName : shortName;

  const handleMouseEnter = () => {
    if (isMobileOrTablet) return;
    setIsHovered(true);
    uiSfx.playHover();
  };

  const handleMouseLeave = () => {
    if (isMobileOrTablet) return;
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    uiSfx.playClick();
    if (isMobileOrTablet) {
      setIsToggled((prev) => !prev);
    }
  };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ overflowAnchor: 'none' }}
    >
      <motion.button
        type="button"
        layout="position"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative inline-flex items-center justify-center font-sans tracking-tight text-lg min-[380px]:text-xl sm:text-3xl md:text-5xl select-none cursor-pointer focus:outline-hidden py-1 px-2.5 sm:px-3 rounded-xl h-[52px] sm:h-[68px] md:h-[76px] max-w-full"
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.01 }}
        transition={{
          layout: { type: 'spring', stiffness: 350, damping: 28 },
        }}
        style={{ overflowAnchor: 'none' }}
        aria-label={`Interactive name: ${currentText}`}
        title={isMobileOrTablet ? 'tekan untuk beralih nama' : 'arahkan kursor untuk melihat nama lengkap'}
      >
        {/* Opening bracket */}
        <motion.span
          layout="position"
          className="text-zinc-300 font-light font-sans group-hover:text-zinc-400 transition-colors duration-200"
          transition={{
            layout: { type: 'spring', stiffness: 350, damping: 28 },
          }}
        >
          [
        </motion.span>

        {/* Dynamic content area */}
        <motion.span
          layout="position"
          className="relative inline-flex items-center justify-center px-2 sm:px-3 overflow-visible h-full"
          transition={{
            layout: { type: 'spring', stiffness: 350, damping: 28 },
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={currentText}
              initial={{ opacity: 0, y: 4, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -4, filter: 'blur(3px)' }}
              transition={{
                duration: 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-zinc-900 font-medium px-0.5 tracking-tight lowercase whitespace-nowrap"
            >
              {currentText}
            </motion.span>
          </AnimatePresence>
        </motion.span>

        {/* Closing bracket */}
        <motion.span
          layout="position"
          className="text-zinc-300 font-light font-sans group-hover:text-zinc-400 transition-colors duration-200"
          transition={{
            layout: { type: 'spring', stiffness: 350, damping: 28 },
          }}
        >
          ]
        </motion.span>
      </motion.button>
    </div>
  );
};
