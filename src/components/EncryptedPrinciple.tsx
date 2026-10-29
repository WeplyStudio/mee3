import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uiSfx } from '../utils/audio';

interface EncryptedPrincipleProps {
  text: string;
  lang?: string;
  className?: string;
}

const LATIN_CIPHER_CHARS = '!<>-_\\/[]{}—=+*^?#_0123456789ABCDEF!@#$%&*';
const JAPANESE_CIPHER_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

export const EncryptedPrinciple: React.FC<EncryptedPrincipleProps> = ({
  text,
  lang = 'en',
  className = '',
}) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const originalTextRef = useRef<string>(text);

  // Keep original text ref updated when language switches
  useEffect(() => {
    originalTextRef.current = text;
    setDisplayText(text);
    setIsEncrypted(false);
    setIsAnimating(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [text]);

  const triggerCipherAnimation = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }

    setIsAnimating(true);
    uiSfx.playScramble();

    const cipherSet = lang === 'ja' ? JAPANESE_CIPHER_CHARS : LATIN_CIPHER_CHARS;
    const target = originalTextRef.current;
    const initialScrambleFrames = 6; // Full scramble phase
    const resolveFrames = 18; // Progressive decrypt phase
    const totalFrames = initialScrambleFrames + resolveFrames;
    let currentFrame = 0;

    intervalRef.current = window.setInterval(() => {
      currentFrame++;
      
      let resolvedCount = 0;
      if (currentFrame > initialScrambleFrames) {
        const resolveProgress = (currentFrame - initialScrambleFrames) / resolveFrames;
        resolvedCount = Math.floor(resolveProgress * target.length);
      }

      const scrambled = target
        .split('')
        .map((char, index) => {
          // Preserve whitespace so typography doesn't jitter
          if (char === ' ') return ' ';
          
          if (index < resolvedCount) {
            return target[index];
          }

          // Random cipher glyph
          return cipherSet[Math.floor(Math.random() * cipherSet.length)];
        })
        .join('');

      setDisplayText(scrambled);

      if (currentFrame >= totalFrames) {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setDisplayText(target);
        setIsAnimating(false);
        setIsEncrypted(false);
      }
    }, 30);
  }, [lang]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerCipherAnimation();
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerCipherAnimation();
        }
      }}
      aria-label={`Principle: ${text}. Click to decrypt animation.`}
      className={`group relative inline-flex items-center gap-2 cursor-pointer select-none py-1 px-1.5 -mx-1.5 rounded-sm transition-all duration-200 active:scale-[0.99] ${
        isAnimating
          ? 'text-black font-mono-code font-medium tracking-tight bg-zinc-100/80'
          : 'text-zinc-700 hover:text-black'
      } ${className}`}
      title="click to encrypt/decrypt"
    >
      <span className="relative inline-block transition-transform duration-200 group-hover:translate-x-0.5">
        {displayText}
      </span>

      {/* Subtle indicator hint on hover/scramble */}
      <span
        className={`text-[10px] font-mono-code transition-all duration-200 ${
          isAnimating
            ? 'opacity-100 text-zinc-900 animate-pulse'
            : 'opacity-0 group-hover:opacity-40 text-zinc-400'
        }`}
      >
        {isAnimating ? '⌁' : '//'}
      </span>
    </div>
  );
};
