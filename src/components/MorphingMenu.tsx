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
  onOpenBio?: () => void;
  onOpenStore?: () => void;
  onOpenStorePath?: (path: string) => void;
  isStoreActive?: boolean;
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

interface MenuLocaleStrings {
  lendAnEar: string;
  close: string;
  home: string;
  aboutMe: string;
  work: string;
  contactMe: string;
  storeCatalog: string;
  storeDashboard: string;
  storeTransactions: string;
  storeReviews: string;
  storeCart: string;
}

const MENU_LOCALE_LABELS: Record<Language, MenuLocaleStrings> = {
  id: {
    lendAnEar: 'dengarkan suasana',
    close: 'tutup',
    home: 'Beranda',
    aboutMe: 'Tentang Saya',
    work: 'Karya',
    contactMe: 'Hubungi Saya',
    storeCatalog: 'Katalog',
    storeDashboard: 'Dashboard',
    storeTransactions: 'Transaksi',
    storeReviews: 'Ulasan',
    storeCart: 'Keranjang',
  },
  en: {
    lendAnEar: 'lend an ear',
    close: 'close',
    home: 'Home',
    aboutMe: 'About Me',
    work: 'Work',
    contactMe: 'Contact Me',
    storeCatalog: 'Catalog',
    storeDashboard: 'Dashboard',
    storeTransactions: 'Transactions',
    storeReviews: 'Reviews',
    storeCart: 'Cart',
  },
  de: {
    lendAnEar: 'hintergrundsound',
    close: 'schließen',
    home: 'Startseite',
    aboutMe: 'Über Mich',
    work: 'Arbeiten',
    contactMe: 'Kontakt',
    storeCatalog: 'Katalog',
    storeDashboard: 'Dashboard',
    storeTransactions: 'Transaktionen',
    storeReviews: 'Bewertungen',
    storeCart: 'Warenkorb',
  },
  ja: {
    lendAnEar: '環境音を聴く',
    close: '閉じる',
    home: 'ホーム',
    aboutMe: 'プロフィール',
    work: '実績',
    contactMe: 'お問い合わせ',
    storeCatalog: 'カタログ',
    storeDashboard: 'ダッシュボード',
    storeTransactions: '取引履歴',
    storeReviews: 'レビュー',
    storeCart: 'カート',
  },
};

export const MorphingMenu: React.FC<Props> = ({
  isOpen,
  setIsOpen,
  lang = 'en',
  isAudioPlaying,
  onToggleAudio,
  onOpenContact,
  onOpenStory,
  onOpenBio,
  onOpenStore,
  onOpenStorePath,
  isStoreActive = false,
  onScrollTo,
  menuLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNameToggled, setIsNameToggled] = useState<boolean>(false);
  const [isNameHovered, setIsNameHovered] = useState<boolean>(false);
  const [menuMode, setMenuMode] = useState<'folio' | 'store'>(() =>
    isStoreActive ? 'store' : 'folio'
  );
  const labels = MENU_LOCALE_LABELS[lang] || MENU_LOCALE_LABELS.en;

  // Sync default menu tab to match active section when menu opens
  useEffect(() => {
    if (isOpen) {
      setMenuMode(isStoreActive ? 'store' : 'folio');
    }
  }, [isOpen, isStoreActive]);

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

  const handleStoreNav = (path: string) => {
    if (onOpenStorePath) {
      handleNav(() => onOpenStorePath(path));
    } else if (onOpenStore) {
      handleNav(onOpenStore);
    }
  };

  return (
    <>
      {/* Backdrop fading in/out behind */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: 'tween',
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
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
      <div className="relative w-[170px] h-[40px] pointer-events-auto z-50">
        <motion.div
          ref={containerRef}
          data-morphing-menu-box="true"
          initial={false}
          animate={
            isOpen
              ? {
                  width: 292,
                  height: 368,
                  borderRadius: 22,
                  backgroundColor: '#121213',
                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                }
              : {
                  width: 170,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#0d0d0e',
                  boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.5)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }
          }
          transition={{
            type: 'tween',
            duration: isOpen ? 0.55 : 0.34,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute top-0 left-1/2 -translate-x-1/2 overflow-hidden border flex flex-col justify-between select-none cursor-pointer max-w-[calc(100vw-32px)]"
          style={{ transformOrigin: 'top center' }}
          onClick={() => {
            if (!isOpen) {
              uiSfx.playClick();
              setIsOpen(true);
            }
          }}
        >
          {/* Closed State Pill Content (Always mounted so it never pops or flickers during transitions) */}
          <div
            className={`absolute inset-x-0 top-0 h-[40px] flex items-center justify-between px-5 text-xs sm:text-[13px] font-sans font-light tracking-tight text-white hover:text-zinc-200 transition-opacity duration-200 ${
              isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <span className="font-mono-code text-zinc-400 tracking-wider text-xs">[ ]</span>
            <span className="font-normal lowercase tracking-tight text-xs sm:text-[13px]">{menuLabel}</span>
          </div>

          {/* Open State Menu Content */}
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
                      {labels.lendAnEar}
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
                    {labels.close}
                  </button>
                </motion.div>

                {/* Middle Block: Folio / Store Text Toggle above Home + Separated Navigation List */}
                <div className="flex flex-col my-auto pl-1 space-y-3">
                  {/* Text Toggle: Folio / Store */}
                  <motion.div
                    variants={itemVariants}
                    className="flex items-center gap-2.5 text-[11px] font-mono-code tracking-tight pb-2 border-b border-white/10"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        uiSfx.playSwitch();
                        setMenuMode('folio');
                      }}
                      onMouseEnter={() => uiSfx.playHover()}
                      className={`cursor-pointer transition-colors whitespace-nowrap ${
                        menuMode === 'folio'
                          ? 'text-white font-semibold underline underline-offset-4'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Folio
                    </button>
                    <span className="text-zinc-600 select-none" aria-hidden="true">/</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        uiSfx.playSwitch();
                        setMenuMode('store');
                      }}
                      onMouseEnter={() => uiSfx.playHover()}
                      className={`cursor-pointer transition-colors whitespace-nowrap ${
                        menuMode === 'store'
                          ? 'text-white font-semibold underline underline-offset-4'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Store
                    </button>
                  </motion.div>

                  {menuMode === 'folio' ? (
                    <nav className="flex flex-col space-y-2">
                      <motion.div variants={itemVariants}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNav(() => onScrollTo('home'));
                          }}
                          onMouseEnter={() => uiSfx.playHover()}
                          className="text-left text-[21px] sm:text-[22px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer w-full whitespace-nowrap"
                        >
                          {labels.home}
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
                          className="text-left text-[21px] sm:text-[22px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer w-full whitespace-nowrap"
                        >
                          {labels.aboutMe}
                        </button>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNav(() => onScrollTo('projects'));
                          }}
                          onMouseEnter={() => uiSfx.playHover()}
                          className="text-left text-[21px] sm:text-[22px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer w-full whitespace-nowrap"
                        >
                          {labels.work}
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
                          className="text-left text-[21px] sm:text-[22px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer w-full whitespace-nowrap"
                        >
                          {labels.contactMe}
                        </button>
                      </motion.div>
                    </nav>
                  ) : (
                    <nav className="flex flex-col space-y-1.5">
                      <motion.div variants={itemVariants}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStoreNav('/store');
                          }}
                          onMouseEnter={() => uiSfx.playHover()}
                          className="text-left text-[20px] sm:text-[21px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer w-full whitespace-nowrap"
                        >
                          {labels.storeCatalog}
                        </button>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStoreNav('/store/dashboard');
                          }}
                          onMouseEnter={() => uiSfx.playHover()}
                          className="text-left text-[20px] sm:text-[21px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer w-full whitespace-nowrap"
                        >
                          {labels.storeDashboard}
                        </button>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStoreNav('/store/transaksi');
                          }}
                          onMouseEnter={() => uiSfx.playHover()}
                          className="text-left text-[20px] sm:text-[21px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer w-full whitespace-nowrap"
                        >
                          {labels.storeTransactions}
                        </button>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStoreNav('/ulasan');
                          }}
                          onMouseEnter={() => uiSfx.playHover()}
                          className="text-left text-[20px] sm:text-[21px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer w-full whitespace-nowrap"
                        >
                          {labels.storeReviews}
                        </button>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStoreNav('/cart');
                          }}
                          onMouseEnter={() => uiSfx.playHover()}
                          className="text-left text-[20px] sm:text-[21px] font-normal tracking-tight text-zinc-300 hover:text-white transition-all duration-200 hover:translate-x-1 leading-snug cursor-pointer w-full whitespace-nowrap"
                        >
                          {labels.storeCart}
                        </button>
                      </motion.div>
                    </nav>
                  )}
                </div>

                {/* Bottom Row: [ jason ]                     bio   instagram   github */}
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
                    {onOpenBio && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNav(onOpenBio);
                        }}
                        onMouseEnter={() => uiSfx.playHover()}
                        className="hover:text-white transition-colors lowercase cursor-pointer"
                      >
                        bio
                      </button>
                    )}
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
