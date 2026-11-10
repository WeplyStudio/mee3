import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { Language } from '../types';

export type BlindsTransitionStage = 'idle' | 'closing' | 'opening';

interface CurtainBlindsTransitionProps {
  stage: BlindsTransitionStage;
  targetPageName?: string;
  lang?: Language;
  menuLabel?: string;
  onClosed?: () => void;
  onOpened?: () => void;
}

function stripDuplicateIds(root: HTMLElement) {
  root.removeAttribute('id');
  const withIds = root.querySelectorAll('[id]');
  withIds.forEach((el) => el.removeAttribute('id'));
}

export const CurtainBlindsTransition: React.FC<CurtainBlindsTransitionProps> = ({
  stage,
  lang = 'en',
  menuLabel = 'menu',
  onClosed,
  onOpened,
}) => {
  const onClosedRef = useRef(onClosed);
  const onOpenedRef = useRef(onOpened);
  useEffect(() => {
    onClosedRef.current = onClosed;
    onOpenedRef.current = onOpened;
  });

  const stageOverlayRef = useRef<HTMLDivElement>(null);
  const outgoingFrameRef = useRef<HTMLDivElement>(null);
  const outgoingContentHostRef = useRef<HTMLDivElement>(null);
  const outgoingMenuPillRef = useRef<HTMLDivElement>(null);
  const outgoingMenuBackdropRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  const restoreLiveViewport = () => {
    const liveViewport = document.getElementById('page-transition-viewport');
    if (liveViewport) {
      gsap.set(liveViewport, {
        clearProps: 'position,top,left,right,bottom,width,height,overflow,zIndex,boxShadow,transform,willChange,backgroundColor',
      });
    }
  };

  useEffect(() => {
    if (stage === 'idle') {
      isAnimatingRef.current = false;
      clearSafetyTimer();
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
      }
      restoreLiveViewport();
      return;
    }

    if (stage === 'closing' && !isAnimatingRef.current) {
      isAnimatingRef.current = true;

      const liveViewport = document.getElementById('page-transition-viewport');
      const liveContent = document.getElementById('page-transition-content');
      const liveFooter = document.getElementById('contact');
      const liveMenuBox = document.querySelector('[data-morphing-menu-box="true"]') as HTMLElement | null;
      const outgoingFrame = outgoingFrameRef.current;
      const outgoingHost = outgoingContentHostRef.current;
      const outgoingMenuPill = outgoingMenuPillRef.current;
      const outgoingMenuBackdrop = outgoingMenuBackdropRef.current;

      if (!liveViewport || !liveContent || !outgoingFrame || !outgoingHost) {
        onClosedRef.current?.();
        setTimeout(() => {
          onOpenedRef.current?.();
        }, 100);
        return;
      }

      // Check if menu was expanded right when navigation was triggered
      const menuRect = liveMenuBox ? liveMenuBox.getBoundingClientRect() : null;
      const wasMenuExpanded = Boolean(menuRect && menuRect.height > 60);

      // 1. Capture exact visual snapshot of Page A at its current scroll position
      const capturedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      outgoingHost.innerHTML = '';

      if (liveFooter) {
        const footerClone = liveFooter.cloneNode(true) as HTMLElement;
        stripDuplicateIds(footerClone);
        footerClone.style.position = 'absolute';
        footerClone.style.bottom = '0';
        footerClone.style.left = '0';
        footerClone.style.right = '0';
        footerClone.style.zIndex = '0';
        outgoingHost.appendChild(footerClone);
      }

      const contentClone = liveContent.cloneNode(true) as HTMLElement;
      stripDuplicateIds(contentClone);
      contentClone.style.position = 'absolute';
      contentClone.style.top = '0';
      contentClone.style.left = '0';
      contentClone.style.right = '0';
      contentClone.style.zIndex = '10';
      contentClone.style.transform = `translate3d(0, -${capturedScrollY}px, 0)`;
      outgoingHost.appendChild(contentClone);

      // 2. Lock Outgoing Screen A at full viewport (scale 1, yPercent 0)
      gsap.set(outgoingFrame, {
        scale: 1,
        yPercent: 0,
        transformOrigin: 'center center',
        force3D: true,
      });

      // If the menu was open when the user clicked a menu link, smoothly morph the outgoing menu box from 280x350 -> 170x40
      if (outgoingMenuPill && outgoingMenuBackdrop) {
        if (wasMenuExpanded && menuRect) {
          gsap.set(outgoingMenuBackdrop, { opacity: 1 });
          gsap.to(outgoingMenuBackdrop, {
            opacity: 0,
            duration: 0.32,
            ease: 'power2.out',
          });
          gsap.fromTo(
            outgoingMenuPill,
            {
              width: menuRect.width,
              height: menuRect.height,
              borderRadius: 22,
            },
            {
              width: 170,
              height: 40,
              borderRadius: 20,
              duration: 0.36,
              ease: 'power3.out',
            }
          );
        } else {
          gsap.set(outgoingMenuBackdrop, { opacity: 0 });
          gsap.set(outgoingMenuPill, {
            width: 170,
            height: 40,
            borderRadius: 20,
          });
        }
      }

      // 3. Position Incoming Live Screen B (#page-transition-viewport) below the stage at scale 0.52
      gsap.set(liveViewport, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        zIndex: 9999995,
        boxShadow: '0 35px 100px rgba(0, 0, 0, 0.78)',
        scale: 0.52,
        yPercent: 112,
        transformOrigin: 'center center',
        willChange: 'transform',
        force3D: true,
      });

      // 4. Switch React route to Page B immediately while Screen A covers the stage
      onClosedRef.current?.();

      // 5. Run Seamless 3-Step Choreography:
      //    Phase 1: Screen A scales down (1 -> 0.52) in the center of the #0b0b0d dark canvas
      //    Phase 2: Screen A slides UP (0 -> -112%) while Screen B slides UP from below (112% -> 0%)
      //    Phase 3: Screen B scales up (0.52 -> 1) to seamlessly become the active viewport
      const tl = gsap.timeline({
        onComplete: () => {
          clearSafetyTimer();
          restoreLiveViewport();
          isAnimatingRef.current = false;
          onOpenedRef.current?.();
        },
      });
      tlRef.current = tl;

      // Phase 1: Scale down current Screen A into a centered card on the dark canvas
      tl.to(outgoingFrame, {
        scale: 0.52,
        duration: 0.56,
        ease: 'power3.inOut',
      });

      // Phase 2: Slide Screen A up and out while sliding Screen B up into center
      tl.to(
        outgoingFrame,
        {
          yPercent: -112,
          duration: 0.68,
          ease: 'power3.inOut',
        },
        '-=0.04'
      );

      tl.to(
        liveViewport,
        {
          yPercent: 0,
          duration: 0.68,
          ease: 'power3.inOut',
        },
        '<'
      );

      // Phase 3: Expand Screen B smoothly to full screen
      tl.to(
        liveViewport,
        {
          scale: 1,
          duration: 0.56,
          ease: 'power3.inOut',
        },
        '-=0.04'
      );

      clearSafetyTimer();
      safetyTimerRef.current = window.setTimeout(() => {
        if (isAnimatingRef.current) {
          tl.progress(1);
        }
      }, 2400);
    }
  }, [stage]);

  useEffect(() => {
    return () => {
      clearSafetyTimer();
      if (tlRef.current) {
        tlRef.current.kill();
      }
      restoreLiveViewport();
    };
  }, []);

  if (stage === 'idle' || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={stageOverlayRef}
      data-transition-clone="true"
      style={{ zIndex: 9999990 }}
      className="fixed inset-0 bg-[#0b0b0d] pointer-events-auto overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Outgoing Screen A Viewport Frame */}
      <div
        ref={outgoingFrameRef}
        className="fixed inset-0 w-screen h-screen bg-white overflow-hidden shadow-[0_35px_100px_rgba(0,0,0,0.78)] will-change-transform"
      >
        {/* Optional fading menu backdrop if transition began from open menu */}
        <div
          ref={outgoingMenuBackdropRef}
          className="absolute inset-0 bg-black/70 backdrop-blur-[4px] z-35 pointer-events-none opacity-0"
        />

        {/* Top Floating Header Snapshot inside Screen A (Morphing [ ] menu pill + Language badge) */}
        <div className="absolute top-0 left-0 right-0 z-40 px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between pointer-events-none">
          <div className="flex-1 flex justify-start items-center" />
          <div className="flex justify-center">
            <div className="relative w-[170px] h-[40px]">
              <div
                ref={outgoingMenuPillRef}
                style={{ width: 170, height: 40, borderRadius: 20 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#0d0d0e] border border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-[40px] flex items-center justify-between px-5 text-xs sm:text-[13px] font-sans font-light tracking-tight text-white">
                  <span className="font-mono-code text-zinc-400 tracking-wider text-xs">[ ]</span>
                  <span className="font-normal lowercase tracking-tight text-xs sm:text-[13px]">{menuLabel}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 flex justify-end">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-white font-sans text-xs sm:text-[13px] rounded-[8px] sm:rounded-[9px] shadow-xs select-none ${
                lang === 'en'
                  ? 'bg-[#d92338]'
                  : lang === 'id'
                  ? 'bg-emerald-600'
                  : lang === 'de'
                  ? 'bg-slate-700'
                  : 'bg-indigo-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="font-medium lowercase tracking-tight">{lang}</span>
            </div>
          </div>
        </div>

        {/* Cloned Page A Content Host */}
        <div ref={outgoingContentHostRef} className="relative w-full h-full overflow-hidden bg-white" />
      </div>
    </div>,
    document.body
  );
};
