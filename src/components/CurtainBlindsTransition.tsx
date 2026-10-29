import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

export type BlindsTransitionStage = 'idle' | 'closing' | 'opening';

interface CurtainBlindsTransitionProps {
  stage: BlindsTransitionStage;
  targetPageName?: string;
  onClosed?: () => void;
  onOpened?: () => void;
}

const NUM_SLATS = 8;
const SLATS_ARRAY = Array.from({ length: NUM_SLATS }, (_, i) => i);

export const CurtainBlindsTransition: React.FC<CurtainBlindsTransitionProps> = ({
  stage,
  targetPageName,
  onClosed,
  onOpened,
}) => {
  const onClosedRef = useRef(onClosed);
  const onOpenedRef = useRef(onOpened);
  useEffect(() => {
    onClosedRef.current = onClosed;
    onOpenedRef.current = onOpened;
  });

  const hasTriggeredClosedRef = useRef(false);
  const hasTriggeredOpenedRef = useRef(false);
  const stageRef = useRef(stage);

  useEffect(() => {
    stageRef.current = stage;

    if (stage === 'closing') {
      hasTriggeredClosedRef.current = false;
      // Safety fallback timer strictly guarded to only fire once if animation event stalls
      const fallbackTimer = setTimeout(() => {
        if (!hasTriggeredClosedRef.current && stageRef.current === 'closing') {
          hasTriggeredClosedRef.current = true;
          onClosedRef.current?.();
        }
      }, 550);
      return () => clearTimeout(fallbackTimer);
    } else if (stage === 'opening') {
      hasTriggeredOpenedRef.current = false;
      const fallbackTimer = setTimeout(() => {
        if (!hasTriggeredOpenedRef.current && stageRef.current === 'opening') {
          hasTriggeredOpenedRef.current = true;
          onOpenedRef.current?.();
        }
      }, 550);
      return () => clearTimeout(fallbackTimer);
    }
  }, [stage]);

  if (stage === 'idle' || typeof document === 'undefined') return null;

  const isClosing = stage === 'closing';

  const triggerClosed = () => {
    if (!hasTriggeredClosedRef.current && stageRef.current === 'closing') {
      hasTriggeredClosedRef.current = true;
      onClosedRef.current?.();
    }
  };

  const triggerOpened = () => {
    if (!hasTriggeredOpenedRef.current && stageRef.current === 'opening') {
      hasTriggeredOpenedRef.current = true;
      onOpenedRef.current?.();
    }
  };

  const parts = targetPageName ? targetPageName.split('|') : [];
  const hasPipe = parts.length > 1;

  return createPortal(
    <div
      style={{ zIndex: 9999999 }}
      className="fixed inset-0 pointer-events-auto overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Snappy, smooth curtain blinds motion */}
      {SLATS_ARRAY.map((index) => {
        return (
          <motion.div
            key={`slat-${index}`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: isClosing ? 1 : 0 }}
            transition={{
              duration: 0.38,
              delay: isClosing ? index * 0.015 : (NUM_SLATS - 1 - index) * 0.012,
              ease: [0.65, 0, 0.35, 1], // Snappy and silky smooth cubic-bezier
            }}
            onAnimationComplete={() => {
              if (isClosing && index === NUM_SLATS - 1) {
                triggerClosed();
              } else if (!isClosing && index === 0) {
                triggerOpened();
              }
            }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              top: `${(index * 100) / NUM_SLATS}%`,
              height: `calc(${100 / NUM_SLATS}vh + 1.5px)`,
              transformOrigin: isClosing ? 'top' : 'bottom',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
            className="w-full bg-[#0a0a0c] border-b border-white/[0.08] shadow-2xl"
          />
        );
      })}

      {/* Floating Centered Destination Label - Centered across entire screen */}
      {targetPageName && (
        <motion.div
          key={`text-${stage}`}
          initial={{ opacity: 0, y: isClosing ? 10 : 0, scale: 0.98 }}
          animate={{
            opacity: isClosing ? 1 : 0,
            y: isClosing ? 0 : -8,
            scale: isClosing ? 1 : 0.98,
          }}
          transition={{
            duration: isClosing ? 0.3 : 0.22,
            delay: isClosing ? 0.16 : 0,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none px-6 sm:px-12 text-center"
        >
          <div className="max-w-[85vw] sm:max-w-xl text-center flex flex-col items-center justify-center">
            {hasPipe ? (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="text-sm sm:text-base md:text-lg font-mono-code text-white uppercase tracking-wider sm:tracking-widest font-semibold drop-shadow-sm">
                  {parts[0].trim()}
                </div>
                <div className="text-[11px] sm:text-xs text-zinc-400 font-mono-code lowercase tracking-normal sm:tracking-wide max-w-xs sm:max-w-md mx-auto leading-relaxed">
                  {parts[1].trim()}
                </div>
              </div>
            ) : (
              <div className="text-xs sm:text-sm md:text-base font-mono-code text-zinc-100 uppercase tracking-wider sm:tracking-widest font-medium">
                {targetPageName}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>,
    document.body
  );
};
