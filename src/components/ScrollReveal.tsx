import React, { createContext, useContext, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Additional optional delay in milliseconds
  distance?: number; // Slide-up distance in px
}

const ScrollRevealSectionContext = createContext<boolean>(false);

const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789[]/•_-';

function scrambleBracketText(el: HTMLElement, durationSec = 0.65) {
  if (el.dataset.gsapScrambled === 'true') return;
  const original = el.textContent || '';
  if (!original.trim() || original.length > 48) return;
  if (el.children.length > 0) return;

  el.dataset.gsapScrambled = 'true';
  const state = { progress: 0 };

  gsap.to(state, {
    progress: 1,
    duration: durationSec,
    ease: 'power2.out',
    onUpdate: () => {
      const revealCount = Math.floor(state.progress * original.length);
      let out = '';
      for (let i = 0; i < original.length; i++) {
        const ch = original[i];
        if (ch === ' ' || ch === '[' || ch === ']' || i < revealCount) {
          out += ch;
        } else {
          out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      el.textContent = out;
    },
    onComplete: () => {
      el.textContent = original;
    },
  });
}

export const ScrollReveal: React.FC<Props> = ({
  children,
  className = '',
  delay = 0,
  distance = 32,
}) => {
  const isInsideRevealedSection = useContext(ScrollRevealSectionContext);
  const ref = useRef<HTMLDivElement>(null);

  const safeDistance = typeof distance === 'number' && !Number.isNaN(distance) ? distance : 32;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If nested inside a parent ScrollReveal section, animate this sub-block with GSAP when parent reveals or when it enters view
    if (isInsideRevealedSection) {
      gsap.set(el, { opacity: 0, y: Math.min(safeDistance, 24) });
      const subObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const extraDelaySec = Math.min(Math.max(delay, 0), 600) / 1000;
            gsap.to(el, {
              opacity: 1,
              y: 0,
              duration: 0.85,
              delay: 0.15 + extraDelaySec,
              ease: 'power3.out',
              clearProps: 'opacity,transform,willChange',
            });
            subObserver.unobserve(entry.target);
          }
        },
        { threshold: 0.05 }
      );
      subObserver.observe(el);
      return () => subObserver.disconnect();
    }

    // Root Section GSAP choreography (with 1-second delay after entering viewport)
    gsap.set(el, {
      opacity: 0,
      y: safeDistance,
    });

    let delayTimer: number | null = null;
    let tl: gsap.core.Timeline | null = null;

    const runGsapSectionAnimation = () => {
      if (!ref.current) return;
      const root = ref.current;

      // Collect child elements for staggered GSAP choreography
      // Skip .mix-blend-difference, .animate-marquee-infinite, and any intentionally hidden (.opacity-0 / .max-h-0) elements
      const allDescendants = Array.from<HTMLElement>(
        root.querySelectorAll<HTMLElement>(
          'h1, h2, h3, h4, h5, h6, p, li, blockquote, label, button, a, input, textarea, img, svg, .font-mono-code'
        )
      ).filter((node: HTMLElement) => {
        if (
          node.closest('.mix-blend-difference') ||
          node.closest('.animate-marquee-infinite') ||
          node.classList.contains('opacity-0') ||
          node.closest('.opacity-0') ||
          node.closest('.max-h-0')
        ) {
          return false;
        }
        return true;
      });

      const textTargets: HTMLElement[] = [];
      const interactiveTargets: HTMLElement[] = [];
      const mediaTargets: HTMLElement[] = [];
      const bracketTargets: HTMLElement[] = [];

      allDescendants.forEach((node) => {
        node.dataset.gsapHandled = 'true';
        const tag = node.tagName.toLowerCase();
        const text = (node.textContent || '').trim();

        if (
          node.classList.contains('font-mono-code') &&
          node.children.length === 0 &&
          text.startsWith('[') &&
          text.endsWith(']')
        ) {
          bracketTargets.push(node);
        }

        if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'textarea') {
          interactiveTargets.push(node);
        } else if (tag === 'img' || tag === 'svg') {
          mediaTargets.push(node);
        } else {
          textTargets.push(node);
        }
      });

      tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
      });

      // 1. Reveal section container
      tl.to(root, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        clearProps: 'opacity,transform,willChange',
      });

      // 2. Animate every text element inside the section with staggered rise & blur-to-crisp
      if (textTargets.length > 0) {
        tl.fromTo(
          textTargets,
          {
            opacity: 0,
            y: 18,
            filter: 'blur(4px)',
          },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.75,
            stagger: 0.03,
            ease: 'power3.out',
            clearProps: 'opacity,transform,filter,willChange',
          },
          0.06
        );
      }

      // 3. Scramble bracket labels like [who am i], [principles], [services], etc.
      if (bracketTargets.length > 0) {
        tl.add(() => {
          bracketTargets.forEach((b) => scrambleBracketText(b, 0.65));
        }, 0.1);
      }

      // 4. Animate every button, link, input with GSAP spring pop
      if (interactiveTargets.length > 0) {
        tl.fromTo(
          interactiveTargets,
          {
            opacity: 0,
            y: 12,
            scale: 0.94,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.65,
            stagger: 0.035,
            ease: 'back.out(1.5)',
            clearProps: 'opacity,transform,willChange',
          },
          0.12
        );
      }

      // 5. Animate every image & SVG icon with GSAP smooth scale & lift
      if (mediaTargets.length > 0) {
        tl.fromTo(
          mediaTargets,
          {
            opacity: 0,
            scale: 0.92,
            y: 14,
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.035,
            ease: 'power3.out',
            clearProps: 'opacity,transform,willChange',
          },
          0.08
        );
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delayTimer === null) {
            delayTimer = window.setTimeout(() => {
              runGsapSectionAnimation();
            }, 1000);
          }
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px',
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (delayTimer !== null) {
        window.clearTimeout(delayTimer);
      }
      if (tl) {
        tl.kill();
      }
    };
  }, [isInsideRevealedSection, delay, safeDistance]);

  if (isInsideRevealedSection) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <ScrollRevealSectionContext.Provider value={true}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </ScrollRevealSectionContext.Provider>
  );
};
