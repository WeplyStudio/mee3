import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { uiSfx } from '../utils/audio';

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  lang?: Language;
  onSelectLang?: (l: Language) => void;
  isAudioPlaying: boolean;
  onToggleAudio: () => void;
  onOpenContact: () => void;
  onOpenStory: () => void;
  onOpen404?: () => void;
  onScrollTo: (id: string) => void;
  menuLabel: string;
}

// EXTREME Ease-Out Cubic Bezier: Starts EXTREMELY FAST at the first millisecond and decelerates smoothly over 2.5 seconds
const EXTREME_FAST_TO_SLOW = [0.0, 0.98, 0.02, 1.0] as const;

// Staggered motion variants for menu items entry & exit
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      type: 'tween',
      duration: 1.8,
      ease: EXTREME_FAST_TO_SLOW,
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      type: 'tween',
      duration: 1.2,
      ease: EXTREME_FAST_TO_SLOW,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'tween',
      duration: 2.0,
      ease: EXTREME_FAST_TO_SLOW,
    },
  },
};

export const MorphingMenu: React.FC<Props> = ({
  isOpen,
  setIsOpen,
  isAudioPlaying,
  onToggleAudio,
  onOpenContact,
  onOpenStory,
  onScrollTo,
  menuLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNameToggled, setIsNameToggled] = useState<boolean>(false);
  const [isNameHovered, setIsNameHovered] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        uiSfx.playClick();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleNav = (action: () => void) => {
    uiSfx.playClick();
    setIsOpen(false);
    action();
  };

  return (
    <>
      {/* Backdrop fading in/out behind with 2.5s fast-to-slow tween curve */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: 'tween',
              duration: 2.5,
              ease: EXTREME_FAST_TO_SLOW,
            }}
            className="fixed inset-0 bg-black/70 backdrop-blur-[4px] z-45 pointer-events-auto"
            onClick={() => {
              uiSfx.playClick();
              setIsOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Anchor Container */}
      <div className="relative w-[156px] sm:w-[170px] h-[38px] sm:h-[40px] pointer-events-auto z-50">
        <motion.div
          ref={containerRef}
          initial={false}
          animate={
            isOpen
              ? {
                  width: 'min(calc(100vw - 32px), 280px)',
                  height: 'min(calc(100vh - 120px), 390px)',
                  borderRadius: 22,
                  backgroundColor: '#121213',
                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                }
              : {
                  width: '100%',
                  height: '100%',
                  borderRadius: 20,
                  backgroundColor: '#0d0d0e',
                  boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.5)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }
          }
          transition={{
            type: 'tween',
            duration: 2.5,
            ease: EXTREME_FAST_TO_SLOW,
          }}
          className="absolute top-0 left-1/2 -translate-x-1/2 overflow-hidden border flex flex-col justify-between select-none cursor-pointer"
          style={{ transformOrigin: 'top center' }}
          onClick={() => {
            if (!isOpen) {
              uiSfx.playClick();
              setIsOpen(true);
            }
          }}
        >
          {/* Closed State Pill Content */}
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                key="closed-pill-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  type: 'tween',
                  duration: 0.5,
                  ease: EXTREME_FAST_TO_SLOW,
                }}
                className="absolute inset-0 flex items-center justify-between px-5 text-xs sm:text-[13px] font-sans font-light tracking-tight text-white hover:text-zinc-200"
              >
                <span className="font-mono-code text-zinc-400 tracking-wider text-xs">[ ]</span>
                <span className="font-normal lowercase tracking-tight text-xs sm:text-[13px]">{menuLabel}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Open State Menu Content (Clean Minimalist Layout Matching Uploaded Image - No Icons) */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                key="open-menu-content"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col justify-between h-full w-full p-5 text-[#e4e4e7] cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top Row: o lend an ear                     close */}
                <motion.div variants={itemVariants} className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      uiSfx.playSwitch();
                      onToggleAudio();
                    }}
                    onMouseEnter={() => uiSfx.playHover()}
                    className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group lowercase"
                  >
                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">o</span>
                    <span className="font-normal tracking-tight text-zinc-400 group-hover:text-zinc-200 text-xs">
                      lend an ear
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      uiSfx.playClick();
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => uiSfx.playHover()}
                    className="font-bold text-white hover:text-zinc-300 transition-colors tracking-tight text-xs cursor-pointer lowercase"
                  >
                    close
                  </button>
                </motion.div>

                {/* Middle Main Navigation List - Clean Text Only (No Icons) */}
                <nav className="flex flex-col space-y-2 my-auto pl-1">
                  <motion.div variants={itemVariants}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNav(() => onScrollTo('projects'));
                      }}
                      onMouseEnter={() => uiSfx.playHover()}
                      className="text-left text-[21px] sm:text-[23px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer lowercase w-full"
                    >
                      portfolio
                    </button>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNav(onOpenStory);
                      }}
                      onMouseEnter={() => uiSfx.playHover()}
                      className="text-left text-[21px] sm:text-[23px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer lowercase w-full"
                    >
                      identity
                    </button>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNav(() => onScrollTo('thought'));
                      }}
                      onMouseEnter={() => uiSfx.playHover()}
                      className="text-left text-[21px] sm:text-[23px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer lowercase w-full"
                    >
                      thought
                    </button>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNav(() => onScrollTo('stats'));
                      }}
                      onMouseEnter={() => uiSfx.playHover()}
                      className="text-left text-[21px] sm:text-[23px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer lowercase w-full"
                    >
                      evidence
                    </button>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNav(onOpenContact);
                      }}
                      onMouseEnter={() => uiSfx.playHover()}
                      className="text-left text-[21px] sm:text-[23px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer lowercase w-full"
                    >
                      leave a thought
                    </button>
                  </motion.div>
                </nav>

                {/* Bottom Row: [ jason ]                     instagram   github */}
                <motion.div variants={itemVariants} className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      uiSfx.playClick();
                      setIsNameToggled((prev) => !prev);
                    }}
                    onMouseEnter={() => {
                      setIsNameHovered(true);
                      uiSfx.playHover();
                    }}
                    onMouseLeave={() => setIsNameHovered(false)}
                    className="font-mono-code font-bold text-white text-xs tracking-tight select-none cursor-pointer hover:text-zinc-300 transition-colors truncate max-w-[120px]"
                    aria-label={`Toggle brand name: ${(isNameToggled || isNameHovered) ? 'steward jason liuwindra' : 'jason'}`}
                    title="hover atau tekan untuk melihat nama"
                  >
                    [ {(isNameToggled || isNameHovered) ? 'yeaa' : 'jason'} ]
                  </button>

                  <div className="flex items-center gap-3 text-zinc-400 font-normal text-xs">
                    <a
                      href="https://instagram.com/jasonn.doc"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white transition-colors lowercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        uiSfx.playClick();
                      }}
                      onMouseEnter={() => uiSfx.playHover()}
                    >
                      instagram
                    </a>
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white transition-colors lowercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        uiSfx.playClick();
                      }}
                      onMouseEnter={() => uiSfx.playHover()}
                    >
                      github
                    </a>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
};
