"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useAnimationControls } from "motion/react";
import { uiSfx } from "../utils/audio";

export type OrbMimicType =
  | "happy"        // Frame 00:00 & 00:21: Happy curved bean/crescent eyes
  | "capsule"      // Frame 00:02: Neutral vertical capsules
  | "look-right"   // Frame 00:10: Glance up-right with tilt
  | "look-left"    // Frame 00:11: Glance top-left with 3D spherical foreshortening
  | "look-down"    // Frame 00:12: Glance down-right
  | "tilt-right"   // Frame 00:01 & 00:18: Tilted head +32°
  | "tilt-left";   // Frame 00:20: Tilted head -30°

interface NavbarOrbProps {
  size?: number;
  className?: string;
}

export const NavbarOrb: React.FC<NavbarOrbProps> = ({
  size = 38,
  className = "",
}) => {
  const [mimic, setMimic] = useState<OrbMimicType>("happy");
  const [isBlinking, setIsBlinking] = useState(false);
  const [headTilt, setHeadTilt] = useState(0); // in degrees
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [totalSpin, setTotalSpin] = useState(0);
  const [speechReaction, setSpeechReaction] = useState<string | null>(null);

  const orbAnimControls = useAnimationControls();
  const faceAnimControls = useAnimationControls();
  const isBusyRef = useRef(false);
  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Natural idle blink loop for capsule eyes
  useEffect(() => {
    let blinkTimer: NodeJS.Timeout;

    const runBlink = () => {
      const interval = 2400 + Math.random() * 3200;
      blinkTimer = setTimeout(() => {
        if (mimic !== "happy" && !isBusyRef.current) {
          setIsBlinking(true);
          setTimeout(() => {
            setIsBlinking(false);
            runBlink();
          }, 130);
        } else {
          runBlink();
        }
      }, interval);
    };

    runBlink();
    return () => clearTimeout(blinkTimer);
  }, [mimic]);

  // Choreographed Personality Routine closely matching the user's video:
  // - Frame 00:00: Happy crescent/bean eyes (⌒ ⌒)
  // - Frame 00:01: Tilt +32° to the right
  // - Frame 00:02 - 00:09: Center capsule eyes idling & blinking
  // - Frame 00:10: Glance top-right
  // - Frame 00:11: Glance top-left with 3D perspective wrap
  // - Frame 00:12: Glance down-right
  // - Frame 00:13 - 00:17: Return center
  // - [Autonomous bonus]: 360° flip / spin & bouncy hop!
  // - Frame 00:18: Tilt +35° right
  // - Frame 00:20: Roll over to -30° left tilt
  // - Frame 00:21: Happy crescent/bean eyes with joyful bounce!
  useEffect(() => {
    let sequenceTimer: NodeJS.Timeout;
    let isCancelled = false;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const playFullPersonalityRoutine = async () => {
      if (isBusyRef.current) {
        sequenceTimer = setTimeout(playFullPersonalityRoutine, 1500);
        return;
      }

      isBusyRef.current = true;

      try {
        // STEP 1 (Video 00:00): Happy bean eyes with gentle cheerful bob
        setMimic("happy");
        setHeadTilt(0);
        setEyeOffset({ x: 0, y: 0 });
        await orbAnimControls.start({
          y: [-1, -3, 0],
          transition: { duration: 0.8, ease: "easeInOut" },
        });
        await delay(1200);
        if (isCancelled) return;

        // STEP 2 (Video 00:01): Tilt head +32° to the right with capsule eyes
        setMimic("capsule");
        setHeadTilt(32);
        setEyeOffset({ x: 1.5, y: -0.5 });
        await delay(1800);
        if (isCancelled) return;

        // STEP 3 (Video 00:02 - 00:09): Return to center upright, casual blink
        setHeadTilt(0);
        setEyeOffset({ x: 0, y: 0 });
        await delay(1600);
        if (isCancelled) return;

        // Soft double blink
        setIsBlinking(true);
        await delay(120);
        setIsBlinking(false);
        await delay(140);
        setIsBlinking(true);
        await delay(120);
        setIsBlinking(false);
        await delay(1800);
        if (isCancelled) return;

        // STEP 4 (Video 00:10): Glance top-right
        setMimic("look-right");
        setHeadTilt(12);
        setEyeOffset({ x: 3.5, y: -2.5 });
        await delay(1400);
        if (isCancelled) return;

        // STEP 5 (Video 00:11): Glance top-left with 3D perspective foreshortening
        setMimic("look-left");
        setHeadTilt(-16);
        setEyeOffset({ x: -4, y: -3 });
        await delay(1600);
        if (isCancelled) return;

        // STEP 6 (Video 00:12): Glance down-right
        setMimic("look-down");
        setHeadTilt(8);
        setEyeOffset({ x: 3, y: 2.5 });
        await delay(1300);
        if (isCancelled) return;

        // STEP 7 (Video 00:13 - 00:17): Return upright center
        setMimic("capsule");
        setHeadTilt(0);
        setEyeOffset({ x: 0, y: 0 });
        await delay(1200);
        if (isCancelled) return;

        // STEP 8 (AUTONOMOUS 360° SPIN! - "bisa berputar 360 derajat sesuka dia")
        const spinDirection = Math.random() > 0.4 ? 360 : -360;
        const targetRot = totalSpin + spinDirection;
        setTotalSpin(targetRot);
        setMimic("happy");

        await orbAnimControls.start({
          rotate: targetRot,
          y: [-1, -9, 0],
          scaleX: [1, 0.94, 1],
          scaleY: [1, 1.08, 1],
          transition: {
            duration: 0.85,
            ease: [0.34, 1.4, 0.64, 1],
          },
        });
        await delay(500);
        if (isCancelled) return;

        // STEP 9 (AUTONOMOUS JUMP! - "dia juga bisa melompat")
        // Squash on floor
        await orbAnimControls.start({
          scaleX: 1.22,
          scaleY: 0.8,
          y: 0,
          transition: { duration: 0.12, ease: "easeOut" },
        });
        // Airborne jump
        await orbAnimControls.start({
          y: -19,
          scaleX: 0.88,
          scaleY: 1.22,
          transition: { duration: 0.25, ease: "easeOut" },
        });
        // Land squash
        await orbAnimControls.start({
          y: 0,
          scaleX: 1.18,
          scaleY: 0.84,
          transition: { duration: 0.16, ease: "easeIn" },
        });
        // Recover
        await orbAnimControls.start({
          scaleX: 1,
          scaleY: 1,
          y: 0,
          transition: { duration: 0.14, ease: "easeOut" },
        });
        await delay(800);
        if (isCancelled) return;

        // STEP 10 (Video 00:18 - 00:19): Tilt head +35° to the right
        setMimic("tilt-right");
        setHeadTilt(35);
        setEyeOffset({ x: 2, y: -1 });
        await delay(1500);
        if (isCancelled) return;

        // STEP 11 (Video 00:20): Smooth roll from +35° all the way over to -30° left tilt
        setMimic("tilt-left");
        setHeadTilt(-30);
        setEyeOffset({ x: -2, y: 0 });
        await delay(1600);
        if (isCancelled) return;

        // STEP 12 (Video 00:21): Return to center and show HAPPY BEAN EYES with joyful double bounce!
        setMimic("happy");
        setHeadTilt(0);
        setEyeOffset({ x: 0, y: 0 });
        await orbAnimControls.start({
          y: [-2, -7, 0, -4, 0],
          transition: { duration: 0.75, ease: "easeInOut" },
        });
        await delay(1400);
        if (isCancelled) return;

        // STEP 13 (Video 00:22): Tilt right with capsule eyes
        setMimic("capsule");
        setHeadTilt(28);
        setEyeOffset({ x: 1.5, y: -0.5 });
        await delay(1200);

      } catch (err) {
        // Safe catch
      } finally {
        isBusyRef.current = false;
        // Schedule next iteration with random variation
        sequenceTimer = setTimeout(playFullPersonalityRoutine, 1600);
      }
    };

    sequenceTimer = setTimeout(playFullPersonalityRoutine, 400);

    return () => {
      isCancelled = true;
      clearTimeout(sequenceTimer);
    };
  }, [totalSpin, orbAnimControls]);

  // Click handler (Surprise reaction: energized 360° flip + happy hop + sound)
  const handleClick = async () => {
    try {
      uiSfx.playPop();
    } catch {}

    const bubbles = ["✨", "◕‿◕", "★", "o(≧▽≦)o", "₍ᐢ.ˬ.⑅ᐢ₎", "💫"];
    setSpeechReaction(bubbles[Math.floor(Math.random() * bubbles.length)]);

    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => {
      setSpeechReaction(null);
    }, 1100);

    isBusyRef.current = true;
    const nextSpin = totalSpin + 360;
    setTotalSpin(nextSpin);
    setMimic("happy");
    setHeadTilt(0);

    await orbAnimControls.start({
      rotate: nextSpin,
      y: [-22, 0],
      scaleX: [0.86, 1.16, 1],
      scaleY: [1.24, 0.86, 1],
      transition: {
        duration: 0.65,
        ease: [0.175, 0.885, 0.32, 1.275],
      },
    });

    isBusyRef.current = false;
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center pointer-events-auto select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Little speech/emotion badge */}
      {speechReaction && (
        <motion.div
          initial={{ opacity: 0, y: 3, scale: 0.7 }}
          animate={{ opacity: 1, y: -19, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          className="absolute -top-1 pointer-events-none bg-zinc-900 text-white text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full shadow-md z-30 whitespace-nowrap"
        >
          {speechReaction}
        </motion.div>
      )}

      {/* Main Animated Orb Sphere Container */}
      <motion.div
        animate={orbAnimControls}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={handleClick}
        className="relative cursor-pointer rounded-full flex items-center justify-center shrink-0 shadow-xs hover:shadow-md transition-shadow overflow-hidden"
        style={{
          width: size,
          height: size,
          background: "radial-gradient(circle at 36% 32%, #2d2d30 0%, #18181b 45%, #09090b 80%, #000000 100%)",
          boxShadow: "0 2px 8px -1px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.12)",
        }}
        title="Living Orb"
      >
        {/* Soft 3D Specular Highlight on top-left rim */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 48%)",
          }}
        />

        {/* ------------------------------------------------------------- */}
        {/* ROTATING & TILTING FACE LAYER (Matches video head tilts)       */}
        {/* ------------------------------------------------------------- */}
        <motion.div
          animate={{
            rotate: headTilt,
            x: eyeOffset.x,
            y: eyeOffset.y,
          }}
          transition={{
            duration: 0.45,
            ease: [0.25, 1, 0.5, 1],
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          {/* 1. HAPPY BEAN / CRESCENT EYES (Frames 00:00 & 00:21 in Video) */}
          {mimic === "happy" ? (
            <div className="flex items-center justify-center gap-[4.5px]">
              {/* Left Kidney/Bean Eye */}
              <svg width="10" height="8" viewBox="0 0 15 10" fill="none">
                <path
                  d="M 1.8 7 C 2 3.2, 4.5 1.2, 7.8 1.2 C 11.2 1.2, 13.8 3.2, 14 7 C 12.2 5.2, 10 4.6, 7.8 4.6 C 5.6 4.6, 3.6 5.2, 1.8 7 Z"
                  fill="#FFFFFF"
                  stroke="#FFFFFF"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </svg>
              {/* Right Kidney/Bean Eye */}
              <svg width="10" height="8" viewBox="0 0 15 10" fill="none">
                <path
                  d="M 1.8 7 C 2 3.2, 4.5 1.2, 7.8 1.2 C 11.2 1.2, 13.8 3.2, 14 7 C 12.2 5.2, 10 4.6, 7.8 4.6 C 5.6 4.6, 3.6 5.2, 1.8 7 Z"
                  fill="#FFFFFF"
                  stroke="#FFFFFF"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : mimic === "look-left" ? (
            /* 2. LOOK TOP-LEFT WITH 3D SPHERICAL FORESHORTENING (Frame 00:11) */
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Left eye: compressed against the spherical perimeter */}
              <span
                className="absolute bg-white rounded-full"
                style={{
                  width: "15%",
                  height: "34%",
                  left: "14%",
                  top: "31%",
                  transform: "rotate(-10deg)",
                }}
              />
              {/* Right eye: rounder pupil near center */}
              <span
                className="absolute bg-white rounded-full"
                style={{
                  width: "14%",
                  height: "17%",
                  left: "38%",
                  top: "39%",
                }}
              />
            </div>
          ) : mimic === "look-right" ? (
            /* 3. LOOK TOP-RIGHT WITH PERSPECTIVE (Frame 00:10) */
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Left eye: centered pupil */}
              <span
                className="absolute bg-white rounded-full"
                style={{
                  width: "14%",
                  height: "17%",
                  left: "48%",
                  top: "38%",
                }}
              />
              {/* Right eye: compressed against right perimeter */}
              <span
                className="absolute bg-white rounded-full"
                style={{
                  width: "15%",
                  height: "34%",
                  left: "72%",
                  top: "30%",
                  transform: "rotate(10deg)",
                }}
              />
            </div>
          ) : (
            /* 4. CAPSULE EYES WITH BLINK (Frames 00:01 - 00:09, 00:18, 00:20, 00:22) */
            <div className="flex items-center justify-center gap-[4.5px]">
              {/* Left Capsule Eye */}
              <motion.span
                animate={{
                  scaleY: isBlinking ? 0.08 : 1,
                  scaleX: isBlinking ? 1.2 : 1,
                }}
                transition={{ duration: 0.08 }}
                className="block bg-white rounded-full shadow-xs"
                style={{
                  width: "3.8px",
                  height: "9.2px",
                }}
              />
              {/* Right Capsule Eye */}
              <motion.span
                animate={{
                  scaleY: isBlinking ? 0.08 : 1,
                  scaleX: isBlinking ? 1.2 : 1,
                }}
                transition={{ duration: 0.08 }}
                className="block bg-white rounded-full shadow-xs"
                style={{
                  width: "3.8px",
                  height: "9.2px",
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Subtle ambient bottom shadow inside sphere */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(0, 0, 0, 0.45) 0%, transparent 40%)",
          }}
        />
      </motion.div>
    </div>
  );
};
