import React, { useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  pageKey: string;
  lang: string;
}

interface TrackedBlurItem {
  el: HTMLElement | SVGElement;
  maxBlur: number;
  currentFocus: number; // 0 = full optical blur, 1 = crystal sharp
  targetFocus: number;
  appliedFocus: number;
}

const IGNORED_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'meta',
  'link',
  'br',
  'wbr',
  'source',
  'track',
  'defs',
  'lineargradient',
  'radialgradient',
  'clippath',
  'mask',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'g',
  'use',
  'symbol',
  'tspan',
]);

const MEDIA_TAGS = new Set(['img', 'picture', 'video', 'canvas', 'iframe', 'svg']);
const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'textarea', 'select']);
const TEXT_BLOCK_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'blockquote',
  'pre',
  'figcaption',
  'dt',
  'dd',
  'label',
  'hr',
]);

const INLINE_LEAF_TAGS = new Set([
  'span',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'small',
  'code',
  'mark',
  'sub',
  'sup',
  'time',
  'abbr',
  'cite',
  'kbd',
  'samp',
  'var',
  'br',
  'wbr',
  'svg',
]);

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function shouldSkipSubtree(el: HTMLElement | SVGElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (IGNORED_TAGS.has(tag)) return true;

  if (
    tag === 'header' ||
    tag === 'footer' ||
    el.getAttribute('data-transition-clone') === 'true' ||
    el.getAttribute('data-no-scroll-blur') === 'true' ||
    el.getAttribute('role') === 'dialog' ||
    el.getAttribute('aria-modal') === 'true' ||
    el.classList.contains('mix-blend-difference') ||
    el.classList.contains('sr-only')
  ) {
    return true;
  }

  const style = window.getComputedStyle(el);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.position === 'fixed' ||
    style.position === 'sticky'
  ) {
    return true;
  }

  return false;
}

function hasDirectText(el: Element): boolean {
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE && (child.nodeValue || '').trim().length > 0) {
      return true;
    }
  }
  return false;
}

function hasOnlyInlineOrSvgDescendants(el: Element): boolean {
  const children = el.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const tag = child.tagName.toLowerCase();
    if (!INLINE_LEAF_TAGS.has(tag)) {
      return false;
    }
    if (tag !== 'svg' && child.children.length > 0 && !hasOnlyInlineOrSvgDescendants(child)) {
      return false;
    }
  }
  return true;
}

function hasVisibleBoxDecoration(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const bg = style.backgroundColor;
  const hasDistinctBg =
    bg !== '' &&
    bg !== 'transparent' &&
    bg !== 'rgba(0, 0, 0, 0)' &&
    bg !== 'rgb(255, 255, 255)' &&
    bg !== 'rgba(255, 255, 255, 1)';

  const borderTop = parseFloat(style.borderTopWidth || '0');
  const borderBottom = parseFloat(style.borderBottomWidth || '0');
  const borderLeft = parseFloat(style.borderLeftWidth || '0');
  const borderRight = parseFloat(style.borderRightWidth || '0');
  const hasBorder = borderTop > 0 || borderBottom > 0 || borderLeft > 0 || borderRight > 0;

  return hasDistinctBg || hasBorder;
}

function isAtomicBlurTarget(el: HTMLElement | SVGElement): boolean {
  const tag = el.tagName.toLowerCase();

  // 1. Explicitly marked elements
  if (el.getAttribute('data-scroll-blur') === 'true') {
    return true;
  }

  // 2. Media & graphics (images, pictures, videos, canvases, iframes, SVGs)
  if (MEDIA_TAGS.has(tag)) {
    return true;
  }

  // 3. Form controls
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true;
  }

  // 4. Buttons & links: treat normal interactive controls as one unified blur unit,
  //    but recurse into huge card-sized wrapper links/buttons so inner items stagger naturally
  if (tag === 'button' || tag === 'a') {
    const rect = el.getBoundingClientRect();
    const isLargeCardWrapper =
      (rect.height > 240 || el.querySelector('section, article, h1, h2') !== null) &&
      el.querySelector('img, picture, video, h1, h2, h3, p') !== null;
    return !isLargeCardWrapper;
  }

  // 5. Text block primitives & dividers
  if (TEXT_BLOCK_TAGS.has(tag)) {
    if (tag === 'hr') return true;
    if ((el.textContent || '').trim().length > 0 || el.querySelector('svg, img')) {
      return true;
    }
    return false;
  }

  // 6. List items: only atomic if simple text/inline content (otherwise recurse to inner link/button/card)
  if (tag === 'li') {
    if (hasOnlyInlineOrSvgDescendants(el) && (el.textContent || '').trim().length > 0) {
      return true;
    }
    return false;
  }

  if (!(el instanceof HTMLElement)) {
    return false;
  }

  // 7. Compact interactive or styled card / pill / badge boxes (e.g. stat cards, tech badges, principle rows)
  const rect = el.getBoundingClientRect();
  if (
    tag !== 'section' &&
    tag !== 'main' &&
    tag !== 'form' &&
    tag !== 'ul' &&
    tag !== 'ol' &&
    tag !== 'table' &&
    rect.height > 8 &&
    rect.height <= 220 &&
    rect.width > 8 &&
    rect.width <= 560 &&
    !el.querySelector('section, article, main, form, table, ul, ol, input, textarea, select')
  ) {
    // Compact clickable role="button" (e.g. EncryptedPrinciple)
    if (el.getAttribute('role') === 'button') {
      return true;
    }

    // Compact decorated card/badge box with no nested buttons/links (e.g. AnimatedStatCard, tech stack tiles)
    if (
      hasVisibleBoxDecoration(el) &&
      !el.querySelector('button, a') &&
      ((el.textContent || '').trim().length > 0 || el.querySelector('svg, img'))
    ) {
      // Avoid grabbing full-width outer layout containers with a simple bottom border (like accordion rows)
      const style = window.getComputedStyle(el);
      const hasAllBorders =
        parseFloat(style.borderTopWidth || '0') > 0 &&
        parseFloat(style.borderBottomWidth || '0') > 0 &&
        parseFloat(style.borderLeftWidth || '0') > 0 &&
        parseFloat(style.borderRightWidth || '0') > 0;
      const bg = style.backgroundColor;
      const hasDistinctBg =
        bg !== '' &&
        bg !== 'transparent' &&
        bg !== 'rgba(0, 0, 0, 0)' &&
        bg !== 'rgb(255, 255, 255)' &&
        bg !== 'rgba(255, 255, 255, 1)';

      if (hasAllBorders || hasDistinctBg) {
        return true;
      }
    }
  }

  // 8. Any leaf div/span/table-cell/etc. with direct text OR only inline/svg descendants
  if (hasOnlyInlineOrSvgDescendants(el)) {
    const text = (el.textContent || '').trim();
    if (text.length > 0) {
      return true;
    }
    // Standalone icon/badge container with SVG
    if (el.querySelector('svg') && rect.width > 0 && rect.height > 0 && rect.height <= 120) {
      return true;
    }
  } else if (hasDirectText(el) && rect.height > 0 && rect.height <= 160 && !el.querySelector('section, article, form')) {
    return true;
  }

  return false;
}

function computeMaxBlurForElement(el: HTMLElement | SVGElement): number {
  const tag = el.tagName.toLowerCase();
  if (MEDIA_TAGS.has(tag)) {
    return tag === 'svg' ? 9.5 : 14;
  }
  if (INTERACTIVE_TAGS.has(tag)) {
    const fontSize = parseFloat(window.getComputedStyle(el).fontSize || '14');
    return fontSize >= 24 ? 14 : 10;
  }

  const fontSize = parseFloat(window.getComputedStyle(el).fontSize || '14');
  if (fontSize >= 34) return 16;
  if (fontSize >= 22) return 13;
  if (fontSize >= 16) return 10.5;
  if (fontSize >= 13) return 8.5;
  return 7.5;
}

export const GsapGlobalAnimator: React.FC<Props> = ({ pageKey, lang }) => {
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const trackedMap = new Map<HTMLElement | SVGElement, TrackedBlurItem>();
    let rafId: number | null = null;
    let destroyed = false;

    const computeTargetFocus = (el: HTMLElement | SVGElement): number => {
      if (prefersReducedMotion) return 1;

      const vh = window.innerHeight || 800;
      const rect = el.getBoundingClientRect();

      // Invisible or collapsed (e.g. closed accordion panel) -> keep unblurred so opening is crisp
      if (rect.height <= 0 || rect.width <= 0) return 1;

      // Reference point near top-third of element so tall images/cards focus promptly at 4/5 viewport
      const sampleY =
        rect.height <= 64
          ? rect.top + rect.height * 0.4
          : rect.top + Math.min(rect.height * 0.25, 48);

      // 4/5 viewport threshold (80% from top = 20% entered from bottom):
      // - When only slightly entered at bottom (sampleY >= 90% of viewport): full optical blur (0)
      // - Crosses 4/5 of viewport (90% -> 75%, centered near 80%): smoothly focuses to razor sharp (1)
      const blurStart = vh * 0.90;
      const sharpEnd = vh * 0.75;

      let focus: number;
      if (sampleY >= blurStart) {
        focus = 0;
      } else if (sampleY <= sharpEnd) {
        focus = 1;
      } else {
        focus = smoothstep((blurStart - sampleY) / (blurStart - sharpEnd));
      }

      // Near the very bottom of the document, ensure bottommost visible elements can finish sharpening
      const distToDocBottom =
        document.documentElement.scrollHeight - (window.scrollY + vh);
      if (distToDocBottom <= 48 && rect.top < vh * 0.98) {
        const bottomBoost = smoothstep(1 - Math.max(0, distToDocBottom) / 48);
        focus = Math.max(focus, bottomBoost);
      }

      return focus;
    };

    const applyVisualState = (item: TrackedBlurItem, focus: number) => {
      if (Math.abs(item.appliedFocus - focus) < 0.002) return;
      item.appliedFocus = focus;

      if (focus >= 0.996) {
        // Clear inline filter completely when sharp so browser subpixel rendering stays crisp
        // and never interferes with Tailwind/Framer Motion transforms or opacities
        item.el.style.filter = '';
        item.el.style.willChange = '';
        return;
      }

      const blurAmount = (1 - focus) * item.maxBlur;
      item.el.style.willChange = 'filter';
      item.el.style.filter = `blur(${blurAmount.toFixed(2)}px)`;
    };

    const tick = () => {
      if (destroyed) return;
      let needsAnotherFrame = false;

      trackedMap.forEach((item, el) => {
        if (!document.body.contains(el)) {
          trackedMap.delete(el);
          return;
        }

        item.targetFocus = computeTargetFocus(el);
        const diff = item.targetFocus - item.currentFocus;

        if (Math.abs(diff) > 0.003) {
          item.currentFocus += diff * 0.16;
          needsAnotherFrame = true;
        } else {
          item.currentFocus = item.targetFocus;
        }

        applyVisualState(item, item.currentFocus);
      });

      if (needsAnotherFrame) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const scheduleTick = () => {
      if (destroyed) return;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const trackElement = (el: HTMLElement | SVGElement) => {
      if (trackedMap.has(el)) return;
      // Avoid double-blurring if any ancestor is already tracked
      if (el.parentElement?.closest('[data-blur-tracked="true"]')) return;

      el.setAttribute('data-blur-tracked', 'true');
      const initialFocus = computeTargetFocus(el);
      const item: TrackedBlurItem = {
        el,
        maxBlur: computeMaxBlurForElement(el),
        currentFocus: initialFocus,
        targetFocus: initialFocus,
        appliedFocus: -1,
      };
      trackedMap.set(el, item);
      applyVisualState(item, initialFocus);
    };

    const walkAndRegister = (node: Element) => {
      if (prefersReducedMotion) return;
      if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;

      if (node.getAttribute('data-blur-tracked') === 'true') return;
      if (shouldSkipSubtree(node)) return;

      // Never treat the page root container itself as an atomic blur unit
      if (
        node.id === 'page-transition-content' ||
        node.id === 'page-transition-viewport' ||
        node.id === 'root' ||
        node === document.body
      ) {
        const children = node.children;
        for (let i = 0; i < children.length; i++) {
          walkAndRegister(children[i]);
        }
        return;
      }

      if (isAtomicBlurTarget(node)) {
        trackElement(node);
        return;
      }

      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        walkAndRegister(children[i]);
      }
    };

    const scanPage = () => {
      if (destroyed || prefersReducedMotion) return;
      const contentRoot =
        document.getElementById('page-transition-content') || document.body;
      walkAndRegister(contentRoot);
      scheduleTick();
    };

    // Initial scan after route render settles + follow-up scan for async data/images
    const scanTimer1 = window.setTimeout(scanPage, 40);
    const scanTimer2 = window.setTimeout(scanPage, 320);

    // Re-compute blur radii once fonts finish loading
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        if (destroyed) return;
        trackedMap.forEach((item) => {
          item.maxBlur = computeMaxBlurForElement(item.el);
        });
        scheduleTick();
      });
    }

    const onScrollOrResize = () => {
      scheduleTick();
    };

    const onInteractionLayoutChange = () => {
      scheduleTick();
      window.setTimeout(scheduleTick, 180);
      window.setTimeout(scheduleTick, 520);
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    document.addEventListener('click', onInteractionLayoutChange, { passive: true });

    // Watch for height changes (accordions expanding, lazy images loading)
    let resizeObserver: ResizeObserver | null = null;
    const contentRootEl = document.getElementById('page-transition-content');
    if (contentRootEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleTick();
      });
      resizeObserver.observe(contentRootEl);
    }

    // Watch for dynamically mounted content (route transitions, Firestore products, AI replies, tabs)
    let mutationRescanTimer: number | null = null;
    const mutationObserver = new MutationObserver((mutations) => {
      let hasAdditions = false;
      const contentRoot = document.getElementById('page-transition-content');

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement || node instanceof SVGElement) {
            if (contentRoot && !contentRoot.contains(node)) return;
            if (!node.closest('.mix-blend-difference')) {
              walkAndRegister(node);
              hasAdditions = true;
            }
          }
        });
      });

      if (hasAdditions) {
        scheduleTick();
        if (mutationRescanTimer !== null) window.clearTimeout(mutationRescanTimer);
        mutationRescanTimer = window.setTimeout(scanPage, 120);
      }
    });

    mutationObserver.observe(contentRootEl || document.body, {
      childList: true,
      subtree: true,
    });

    // Subtle interactive micro-feedback on header/footer buttons & links
    const handlePointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.mix-blend-difference') || target.closest('.animate-marquee-infinite')) {
        return;
      }

      const interactiveEl = target.closest<HTMLElement>('header button, header a, footer button, footer a');
      if (interactiveEl) {
        gsap.to(interactiveEl, {
          y: -1.5,
          duration: 0.24,
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

      const interactiveEl = target.closest<HTMLElement>('header button, header a, footer button, footer a');
      if (interactiveEl) {
        gsap.to(interactiveEl, {
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
          clearProps: 'transform',
        });
      }
    };

    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.addEventListener('pointerout', handlePointerOut, { passive: true });

    return () => {
      destroyed = true;
      window.clearTimeout(scanTimer1);
      window.clearTimeout(scanTimer2);
      if (mutationRescanTimer !== null) window.clearTimeout(mutationRescanTimer);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('click', onInteractionLayoutChange);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);

      // Clean up tracked styles on unmount / route change
      trackedMap.forEach((item) => {
        item.el.removeAttribute('data-blur-tracked');
        item.el.style.filter = '';
        item.el.style.willChange = '';
      });
      trackedMap.clear();
    };
  }, [pageKey, lang]);

  return null;
};
