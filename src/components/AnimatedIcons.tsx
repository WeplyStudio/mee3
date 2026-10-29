import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Send,
  Copy,
  Check,
  Folder,
  User,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';

/**
 * Animated Sound Wave Equalizer (animatedicons.co inspired)
 * Displays dancing rhythmic equalizer bars when audio is playing,
 * with interactive hover spring reaction.
 */
interface AnimatedSoundWaveProps {
  isPlaying: boolean;
  size?: number;
  className?: string;
}

export const AnimatedSoundWave: React.FC<AnimatedSoundWaveProps> = ({
  isPlaying,
  size = 14,
  className = '',
}) => {
  const bars = [
    { min: 3, max: 12, dur: 0.7, delay: 0 },
    { min: 4, max: 14, dur: 0.55, delay: 0.15 },
    { min: 2, max: 10, dur: 0.65, delay: 0.3 },
    { min: 4, max: 13, dur: 0.5, delay: 0.1 },
  ];

  return (
    <div
      className={`inline-flex items-center justify-center gap-[2px] h-[14px] px-0.5 ${className}`}
      style={{ width: size + 4, height: size }}
      title={isPlaying ? 'Audio active' : 'Audio muted'}
    >
      {bars.map((bar, i) => (
        <motion.span
          key={i}
          className={`w-[2px] rounded-full transition-colors ${
            isPlaying ? 'bg-emerald-500' : 'bg-zinc-400 group-hover:bg-zinc-700'
          }`}
          animate={
            isPlaying
              ? {
                  height: [bar.min, bar.max, bar.min],
                  opacity: [0.7, 1, 0.7],
                }
              : {
                  height: 3,
                  opacity: 0.5,
                }
          }
          transition={
            isPlaying
              ? {
                  repeat: Infinity,
                  duration: bar.dur,
                  delay: bar.delay,
                  ease: 'easeInOut',
                }
              : { duration: 0.25 }
          }
        />
      ))}
    </div>
  );
};

/**
 * Animated Mail / Envelope Icon (animatedicons.co inspired)
 * Floats, tilts and pulses playfully on hover with spring physics.
 */
interface AnimatedMailProps {
  size?: number;
  className?: string;
}

export const AnimatedMail: React.FC<AnimatedMailProps> = ({
  size = 18,
  className = '',
}) => {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <motion.div
        variants={{
          rest: { scale: 1, y: 0, rotate: 0 },
          hover: {
            scale: 1.15,
            y: -2,
            rotate: [-2, 4, -2, 0],
            transition: {
              rotate: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
              scale: { type: 'spring', stiffness: 400, damping: 12 },
              y: { type: 'spring', stiffness: 400, damping: 12 },
            },
          },
        }}
      >
        <Mail size={size} />
      </motion.div>
    </motion.div>
  );
};

/**
 * Animated Send / Rocket Plane Icon (animatedicons.co inspired)
 * Glides up and right on hover, springs back dynamically.
 */
interface AnimatedSendProps {
  size?: number;
  className?: string;
}

export const AnimatedSend: React.FC<AnimatedSendProps> = ({
  size = 16,
  className = '',
}) => {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover="hover"
      whileTap={{ scale: 0.88 }}
      initial="rest"
      animate="rest"
    >
      <motion.div
        variants={{
          rest: { x: 0, y: 0, scale: 1, rotate: 0 },
          hover: {
            x: [0, 3, 0],
            y: [0, -3, 0],
            rotate: [0, -8, 0],
            scale: 1.12,
            transition: {
              repeat: Infinity,
              duration: 1.4,
              ease: 'easeInOut',
            },
          },
        }}
      >
        <Send size={size} />
      </motion.div>
    </motion.div>
  );
};

/**
 * Animated Copy & Check Icon (animatedicons.co inspired)
 * Morphs seamlessly with spring burst between clipboard and checkmark.
 */
interface AnimatedCopyProps {
  isCopied: boolean;
  size?: number;
  className?: string;
}

export const AnimatedCopy: React.FC<AnimatedCopyProps> = ({
  isCopied,
  size = 15,
  className = '',
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center w-[18px] h-[18px] ${className}`}>
      <AnimatePresence mode="wait">
        {isCopied ? (
          <motion.div
            key="check-icon"
            initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.4, opacity: 0, rotate: 45 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            className="text-emerald-500"
          >
            <Check size={size} />
          </motion.div>
        ) : (
          <motion.div
            key="copy-icon"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.18, rotate: [0, -6, 6, 0] }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
          >
            <Copy size={size} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Animated Folder Icon (animatedicons.co inspired)
 * Open-tab micro bounce on hover for portfolio item.
 */
interface AnimatedFolderProps {
  size?: number;
  className?: string;
}

export const AnimatedFolder: React.FC<AnimatedFolderProps> = ({
  size = 18,
  className = '',
}) => {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <motion.div
        variants={{
          rest: { scale: 1, rotate: 0 },
          hover: {
            scale: 1.2,
            rotate: -4,
            transition: { type: 'spring', stiffness: 350, damping: 10 },
          },
        }}
      >
        <Folder size={size} />
      </motion.div>
    </motion.div>
  );
};

/**
 * Animated User / Identity Icon (animatedicons.co inspired)
 * Subtle spring tilt and nod.
 */
interface AnimatedUserProps {
  size?: number;
  className?: string;
}

export const AnimatedUser: React.FC<AnimatedUserProps> = ({
  size = 18,
  className = '',
}) => {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <motion.div
        variants={{
          rest: { scale: 1, y: 0 },
          hover: {
            scale: 1.18,
            y: -1.5,
            transition: { type: 'spring', stiffness: 400, damping: 12 },
          },
        }}
      >
        <User size={size} />
      </motion.div>
    </motion.div>
  );
};

/**
 * Animated Sparkles Icon (animatedicons.co inspired)
 * Dynamic twinkle and rotation on hover.
 */
interface AnimatedSparkleProps {
  size?: number;
  className?: string;
}

export const AnimatedSparkle: React.FC<AnimatedSparkleProps> = ({
  size = 18,
  className = '',
}) => {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <motion.div
        variants={{
          rest: { scale: 1, rotate: 0 },
          hover: {
            scale: [1, 1.25, 1.1],
            rotate: [0, 18, -12, 0],
            transition: {
              repeat: Infinity,
              duration: 1.6,
              ease: 'easeInOut',
            },
          },
        }}
      >
        <Sparkles size={size} />
      </motion.div>
    </motion.div>
  );
};

/**
 * Animated Shield / Evidence Icon (animatedicons.co inspired)
 * Pop scale and badge glint on hover.
 */
interface AnimatedEvidenceProps {
  size?: number;
  className?: string;
}

export const AnimatedEvidence: React.FC<AnimatedEvidenceProps> = ({
  size = 18,
  className = '',
}) => {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <motion.div
        variants={{
          rest: { scale: 1, y: 0 },
          hover: {
            scale: 1.18,
            y: -1,
            transition: { type: 'spring', stiffness: 400, damping: 10 },
          },
        }}
      >
        <ShieldCheck size={size} />
      </motion.div>
    </motion.div>
  );
};

/**
 * Animated Diagonal Arrow Icon (animatedicons.co inspired)
 * Jumps diagonally up-right and loops smoothly on hover.
 */
interface AnimatedArrowProps {
  size?: number;
  className?: string;
}

export const AnimatedArrowUpRight: React.FC<AnimatedArrowProps> = ({
  size = 14,
  className = '',
}) => {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <motion.div
        variants={{
          rest: { x: 0, y: 0 },
          hover: {
            x: [0, 2, 0],
            y: [0, -2, 0],
            transition: { repeat: Infinity, duration: 0.9, ease: 'easeInOut' },
          },
        }}
      >
        <ArrowUpRight size={size} />
      </motion.div>
    </motion.div>
  );
};

/**
 * Animated Close / Cross Icon (animatedicons.co inspired)
 * Spins 90 degrees with a spring stop.
 */
interface AnimatedCloseProps {
  size?: number;
  className?: string;
}

export const AnimatedClose: React.FC<AnimatedCloseProps> = ({
  size = 16,
  className = '',
}) => {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover={{ rotate: 90, scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
    >
      <X size={size} />
    </motion.div>
  );
};
