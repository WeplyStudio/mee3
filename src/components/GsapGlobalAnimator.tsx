import React, { useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  pageKey: string;
  lang: string;
}

const SELECTOR_ALL_ANIMATABLE =
  'header button, header a, footer h1, footer h2, footer h3, footer p, footer a, footer button, footer span, h1, h2, h3, h4, h5, h6, p, li, blockquote, label, button, a, input, textarea, img, svg, .font-mono-code';

export const GsapGlobalAnimator: React.FC<Props> = ({ pageKey, lang }) => {
  useEffect(() => {
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          intersectionObserver.unobserve(el);

          if (el.dataset.gsapAnimated === 'true') return;
          el.dataset.gsapAnimated = 'true';

          // Never override mix-blend-difference, infinite marquee, custom GSAP stage, or intentionally hidden elements
          if (
            el.closest('.mix-blend-difference') ||
            el.closest('.animate-marquee-infinite') ||
            el.closest('[data-gsap-custom="true"]') ||
            el.classList.contains('opacity-0') ||
            el.closest('.opacity-0') ||
            el.closest('.max-h-0')
          ) {
            return;
          }

          const tag = el.tagName.toLowerCase();
          if (tag === 'button' || tag === 'a') {
            gsap.fromTo(
              el,
              { opacity: 0, y: 12, scale: 0.94 },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.65,
                ease: 'back.out(1.6)',
                clearProps: 'opacity,transform,willChange',
              }
            );
          } else if (tag === 'img' || tag === 'svg') {
            gsap.fromTo(
              el,
              { opacity: 0, scale: 0.92, y: 12 },
              {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 0.7,
                ease: 'power3.out',
                clearProps: 'opacity,transform,willChange',
              }
            );
          } else {
            gsap.fromTo(
              el,
              { opacity: 0, y: 14, filter: 'blur(4px)' },
              {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.7,
                ease: 'power3.out',
                clearProps: 'opacity,transform,filter,willChange',
              }
            );
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -10px 0px',
      }
    );

    const registerElements = (root: ParentNode = document) => {
      const elements = root.querySelectorAll<HTMLElement>(SELECTOR_ALL_ANIMATABLE);
      elements.forEach((el) => {
        if (
          el.dataset.gsapHandled === 'true' ||
          el.dataset.gsapObserved === 'true' ||
          el.closest('.mix-blend-difference') ||
          el.closest('.animate-marquee-infinite') ||
          el.closest('[data-gsap-custom="true"]') ||
          el.classList.contains('opacity-0') ||
          el.closest('.opacity-0') ||
          el.closest('.max-h-0')
        ) {
          return;
        }
        el.dataset.gsapObserved = 'true';
        intersectionObserver.observe(el);
      });
    };

    // Initial scan
    const scanTimer = window.setTimeout(() => {
      registerElements(document);
    }, 60);

    // Watch for dynamically mounted elements (accordions, modals, AI replies, menu items)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (
              !node.closest('.mix-blend-difference') &&
              !node.closest('.animate-marquee-infinite')
            ) {
              registerElements(node);
            }
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Global interactive GSAP hover & click micro-animations for every text and web element
    const handlePointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('.mix-blend-difference') || target.closest('.animate-marquee-infinite')) {
        return;
      }

      const interactiveEl = target.closest<HTMLElement>('button, a');
      if (interactiveEl) {
        gsap.to(interactiveEl, {
          y: -2,
          scale: 1.02,
          duration: 0.28,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        return;
      }

      const textEl = target.closest<HTMLElement>('h1, h2, h3, h4, p, li, .font-mono-code');
      if (textEl && !textEl.querySelector('h1, h2, h3, p') && !textEl.classList.contains('opacity-0')) {
        gsap.to(textEl, {
          x: 2,
          duration: 0.28,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    const handlePointerOut = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('.mix-blend-difference') || target.closest('.animate-marquee-infinite')) {
        return;
      }

      const interactiveEl = target.closest<HTMLElement>('button, a');
      if (interactiveEl) {
        gsap.to(interactiveEl, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.4,
          ease: 'elastic.out(1, 0.6)',
          overwrite: 'auto',
          clearProps: 'transform',
        });
        return;
      }

      const textEl = target.closest<HTMLElement>('h1, h2, h3, h4, p, li, .font-mono-code');
      if (textEl && !textEl.querySelector('h1, h2, h3, p') && !textEl.classList.contains('opacity-0')) {
        gsap.to(textEl, {
          x: 0,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto',
          clearProps: 'transform',
        });
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactiveEl = target.closest<HTMLElement>('button, a');
      if (interactiveEl && !interactiveEl.closest('.mix-blend-difference')) {
        gsap.fromTo(
          interactiveEl,
          { scale: 0.95 },
          {
            scale: 1,
            duration: 0.35,
            ease: 'elastic.out(1.2, 0.5)',
            overwrite: 'auto',
          }
        );
      }
    };

    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.addEventListener('pointerout', handlePointerOut, { passive: true });
    document.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      window.clearTimeout(scanTimer);
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [pageKey, lang]);

  return null;
};
