import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { uiSfx } from '../utils/audio';

interface FooterRobotProps {
  isActive?: boolean;
  className?: string;
}

const DEFAULT_CAM_POS = new THREE.Vector3(-1.15, 1.78, 5.15);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0.0, 1.18, 0.0);

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createScreenGradientTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Deep velvety obsidian-indigo gradient harmonized with the minimalist monochrome footer
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#0d0d17');
    grad.addColorStop(0.45, '#141326');
    grad.addColorStop(0.85, '#1c1938');
    grad.addColorStop(1.0, '#221d46');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const vig = ctx.createRadialGradient(128, 136, 40, 128, 128, 165);
    vig.addColorStop(0, 'rgba(72, 62, 165, 0.14)');
    vig.addColorStop(1, 'rgba(4, 4, 10, 0.58)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createEyeAOTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 68, 16, 64, 68, 60);
    grad.addColorStop(0.0, 'rgba(4, 3, 12, 0.82)');
    grad.addColorStop(0.55, 'rgba(6, 5, 16, 0.38)');
    grad.addColorStop(1.0, 'rgba(6, 5, 16, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 22, 128, 128, 118);
    grad.addColorStop(0.0, 'rgba(9, 9, 11, 0.34)');
    grad.addColorStop(0.42, 'rgba(9, 9, 11, 0.18)');
    grad.addColorStop(0.75, 'rgba(9, 9, 11, 0.05)');
    grad.addColorStop(1.0, 'rgba(9, 9, 11, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(c);
}

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

export const FooterRobot: React.FC<FooterRobotProps> = ({
  isActive = true,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const isActiveRef = useRef<boolean>(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let destroyed = false;
    let frameId = 0;
    let isVisibleInViewport = true;
    const isSoftwareGl = detectSoftwareWebGL();

    // 1. Scene, Camera, Transparent Renderer
    const scene = new THREE.Scene();
    scene.background = null;

    const initialW = Math.max(container.clientWidth, 120);
    const initialH = Math.max(container.clientHeight, 120);

    const camera = new THREE.PerspectiveCamera(34, initialW / initialH, 0.1, 60);
    camera.position.copy(DEFAULT_CAM_POS);
    camera.lookAt(DEFAULT_CAM_TARGET);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(initialW, initialH);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.outline = 'none';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Studio environment map for crisp metallic bevels & clearcoat sheen on white background
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const disposables: Array<{ dispose: () => void }> = [envRT];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    // 2. Soft Ground Contact Shadow directly beneath the robot's base socket
    const contactShadowTex = track(createContactShadowTexture());
    const contactShadowGeo = track(new THREE.PlaneGeometry(2.15, 2.15));
    const contactShadowMat = track(
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.62,
      })
    );
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.01, 0);
    scene.add(contactShadow);

    // 3. Robot Assembly (Composite Multi-Part Procedural Model — Head & Neck without Cube Pedestal)
    const robotGroup = new THREE.Group();
    scene.add(robotGroup);

    // 3A. Twin-Peg Neck & Joint Assembly grounded flush at y = 0
    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 0, 0);
    robotGroup.add(neckGroup);

    const darkChromeMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x1c1d26,
        metalness: 0.9,
        roughness: 0.15,
        clearcoat: 0.72,
        clearcoatRoughness: 0.12,
        envMapIntensity: 0.75,
      })
    );

    const matteCollarMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x22232b,
        metalness: 0.55,
        roughness: 0.45,
        clearcoat: 0.18,
        envMapIntensity: 0.42,
      })
    );

    const pegGeo = track(new THREE.CylinderGeometry(0.088, 0.115, 0.36, 24));
    const leftPeg = new THREE.Mesh(pegGeo, darkChromeMat);
    leftPeg.position.set(-0.125, 0.14, 0.01);
    leftPeg.rotation.z = -0.07;
    neckGroup.add(leftPeg);

    const rightPeg = new THREE.Mesh(pegGeo, darkChromeMat);
    rightPeg.position.set(0.125, 0.14, -0.01);
    rightPeg.rotation.z = 0.07;
    neckGroup.add(rightPeg);

    const socketGeo = track(new THREE.CylinderGeometry(0.24, 0.28, 0.05, 28));
    const socketMesh = new THREE.Mesh(socketGeo, matteCollarMat);
    socketMesh.position.y = 0.015;
    neckGroup.add(socketMesh);

    const lowerCollarGeo = track(new THREE.CylinderGeometry(0.36, 0.21, 0.24, 32));
    const lowerCollar = new THREE.Mesh(lowerCollarGeo, matteCollarMat);
    lowerCollar.position.y = 0.39;
    neckGroup.add(lowerCollar);

    const midRingGeo = track(new THREE.TorusGeometry(0.358, 0.028, 14, 40));
    const midRing = new THREE.Mesh(midRingGeo, darkChromeMat);
    midRing.rotation.x = Math.PI / 2;
    midRing.position.y = 0.515;
    neckGroup.add(midRing);

    const upperBellGeo = track(new THREE.CylinderGeometry(0.215, 0.362, 0.48, 36));
    const upperBell = new THREE.Mesh(upperBellGeo, darkChromeMat);
    upperBell.position.y = 0.76;
    neckGroup.add(upperBell);

    // 3B. Monitor Head & Bezel
    const headPivotBaseY = 0.98;
    const headPivot = new THREE.Group();
    headPivot.position.set(0, headPivotBaseY, 0);
    robotGroup.add(headPivot);

    const headModel = new THREE.Group();
    headModel.position.set(0, 0.62, 0);
    headPivot.add(headModel);

    const headW = 2.08;
    const headH = 1.26;
    const headD = 1.04;
    const headCasingGeo = track(new RoundedBoxGeometry(headW, headH, headD, 7, 0.2));
    const headCasingMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x18181f,
        metalness: 0.78,
        roughness: 0.24,
        clearcoat: 0.42,
        clearcoatRoughness: 0.18,
        envMapIntensity: 0.62,
      })
    );
    const headCasing = new THREE.Mesh(headCasingGeo, headCasingMat);
    headCasing.castShadow = true;
    headCasing.receiveShadow = true;
    headModel.add(headCasing);

    // Side Ear Ports
    const rimGeo = track(new THREE.TorusGeometry(0.145, 0.018, 14, 32));
    const rimMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x626575,
        metalness: 0.92,
        roughness: 0.22,
        clearcoat: 0.5,
        envMapIntensity: 0.8,
      })
    );
    const coreGeo = track(new THREE.CircleGeometry(0.135, 28));
    const coreMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x09090d,
        roughness: 0.85,
        metalness: 0.2,
      })
    );

    const createSideEarPort = (sideSign: number) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(sideSign * (headW / 2 + 0.002), 0.0, 0.02);
      earGroup.rotation.y = sideSign > 0 ? Math.PI / 2 : -Math.PI / 2;

      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.scale.set(0.68, 1.22, 0.8);
      earGroup.add(rimMesh);

      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.scale.set(0.65, 1.18, 1);
      coreMesh.position.z = -0.004;
      earGroup.add(coreMesh);

      return earGroup;
    };

    headModel.add(createSideEarPort(1));
    headModel.add(createSideEarPort(-1));

    // Front Rounded-Rectangle Bezel Frame (adapted refined slate-indigo accent)
    const bezelOuterW = 1.92;
    const bezelOuterH = 1.12;
    const bezelBorder = 0.082;
    const bezelShape = createRoundedRectShape(bezelOuterW, bezelOuterH, 0.16);
    const bezelHole = createRoundedRectShape(
      bezelOuterW - bezelBorder * 2,
      bezelOuterH - bezelBorder * 2,
      0.115
    );
    bezelShape.holes.push(bezelHole);

    const bezelGeo = track(
      new THREE.ExtrudeGeometry(bezelShape, {
        depth: 0.075,
        bevelEnabled: true,
        bevelThickness: 0.024,
        bevelSize: 0.02,
        bevelSegments: 4,
        curveSegments: 20,
      })
    );
    const bezelMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x2c2b3a,
        emissive: 0x131126,
        emissiveIntensity: 0.35,
        metalness: 0.35,
        roughness: 0.28,
        clearcoat: 0.48,
        clearcoatRoughness: 0.18,
        envMapIntensity: 0.65,
      })
    );
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.z = headD / 2 - 0.048;
    headModel.add(bezelMesh);

    // Recessed Screen
    const screenW = bezelOuterW - bezelBorder * 2 + 0.03;
    const screenH = bezelOuterH - bezelBorder * 2 + 0.03;
    const screenShape = createRoundedRectShape(screenW, screenH, 0.11);
    const screenGeo = track(new THREE.ShapeGeometry(screenShape, 20));
    const uvAttr = screenGeo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      const u = (uvAttr.getX(i) + screenW / 2) / screenW;
      const v = (uvAttr.getY(i) + screenH / 2) / screenH;
      uvAttr.setXY(i, u, v);
    }

    const screenTex = track(createScreenGradientTexture(maxAnisotropy));
    const screenMat = track(
      new THREE.MeshPhysicalMaterial({
        map: screenTex,
        emissive: 0x100e26,
        emissiveIntensity: 0.45,
        roughness: 0.56,
        metalness: 0.08,
        clearcoat: 0.2,
        clearcoatRoughness: 0.35,
        envMapIntensity: 0.28,
      })
    );
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.z = headD / 2 - 0.008;
    headModel.add(screenMesh);

    // 3D. Protruding 3D Pearl-White Eyes
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(0, 0.095, headD / 2 + 0.002);
    headModel.add(eyeGroup);

    const eyeGeo = track(new THREE.SphereGeometry(0.185, 28, 28));
    const eyeMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0xdbe4ff,
        emissiveIntensity: 0.24,
        roughness: 0.18,
        metalness: 0.04,
        clearcoat: 0.72,
        clearcoatRoughness: 0.12,
        envMapIntensity: 0.65,
      })
    );

    const eyeAOTex = track(createEyeAOTexture());
    const eyeAOGeo = track(new THREE.PlaneGeometry(0.48, 0.48));
    const eyeAOMat = track(
      new THREE.MeshBasicMaterial({
        map: eyeAOTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.68,
      })
    );

    const EYE_SPACING = 0.365;

    const leftEyeHolder = new THREE.Group();
    leftEyeHolder.position.set(-EYE_SPACING, 0, 0);
    eyeGroup.add(leftEyeHolder);

    const leftEyeAO = new THREE.Mesh(eyeAOGeo, eyeAOMat);
    leftEyeAO.position.set(0, -0.025, -0.004);
    leftEyeHolder.add(leftEyeAO);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.scale.set(1.0, 1.0, 0.64);
    leftEye.position.z = 0.015;
    leftEyeHolder.add(leftEye);

    const rightEyeHolder = new THREE.Group();
    rightEyeHolder.position.set(EYE_SPACING, 0, 0);
    eyeGroup.add(rightEyeHolder);

    const rightEyeAO = new THREE.Mesh(eyeAOGeo, eyeAOMat);
    rightEyeAO.position.set(0, -0.025, -0.004);
    rightEyeHolder.add(rightEyeAO);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.scale.set(1.0, 1.0, 0.64);
    rightEye.position.z = 0.015;
    rightEyeHolder.add(rightEye);

    // 4. Balanced Editorial Studio Lighting (Warm Key + Cool Hemisphere Fill + Crisp Rim)
    const hemiLight = new THREE.HemisphereLight(0xf4f6ff, 0xd4d4d8, 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ec, 2.2);
    keyLight.position.set(4.5, 6.2, 5.2);
    scene.add(keyLight);

    const coolRimLight = new THREE.DirectionalLight(0xdce6ff, 1.65);
    coolRimLight.position.set(-4.2, 5.0, 3.8);
    scene.add(coolRimLight);

    const backRimLight = new THREE.PointLight(0x9ea8ff, 8.0, 8.0, 1.6);
    backRimLight.position.set(-1.6, 2.2, -1.6);
    scene.add(backRimLight);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 5. Interaction State (tracks cursor relative to the bottom-right robot position)
    const state = {
      mouseX: -0.22,
      mouseY: 0.14,
      smoothMouseX: -0.22,
      smoothMouseY: 0.14,
      lastMouseMoveTime: performance.now(),
      currentYaw: -0.18,
      currentPitch: -0.06,
      currentRoll: 0.0,
      nodDisp: 0,
      nodVel: 0,
      hopDisp: 0,
      hopVel: 0,
      blinkQueue: [] as number[],
      nextAutoBlinkTime: 2.5 + Math.random() * 2.5,
      activeBlinkProgress: -1,
    };

    const triggerHappyReaction = () => {
      state.blinkQueue = [0.0, 0.2];
      state.nodVel = 4.6;
      state.hopVel = 1.65;
      try {
        uiSfx.playPop();
      } catch {}
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;

      // Normalize pointer offset relative to the robot's actual bottom-left screen position
      const spanX = Math.max(window.innerWidth * 0.62, 320);
      const spanY = Math.max(window.innerHeight * 0.62, 320);

      state.mouseX = THREE.MathUtils.clamp((e.clientX - centerX) / spanX, -1, 1);
      state.mouseY = THREE.MathUtils.clamp(-(e.clientY - centerY) / spanY, -1, 1);
      state.lastMouseMoveTime = performance.now();
    };

    const handlePointerLeave = () => {
      state.mouseX = -0.22;
      state.mouseY = 0.14;
    };

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      triggerHappyReaction();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    container.addEventListener('click', handleClick);

    // ResizeObserver for crisp container fitting
    const handleResize = () => {
      if (destroyed) return;
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // Pause rendering when scrolled out of view
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          isVisibleInViewport = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.01 }
      );
      io.observe(container);
    }

    // 6. Software-WebGL-Safe Paced Animation Loop
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (destroyed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (destroyed) return;

      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      const shouldRender =
        isVisibleInViewport &&
        isActiveRef.current &&
        document.visibilityState !== 'hidden';

      if (shouldRender) {
        // Smooth cursor damping
        const mouseEase = 1 - Math.exp(-9.0 * dt);
        state.smoothMouseX = THREE.MathUtils.lerp(state.smoothMouseX, state.mouseX, mouseEase);
        state.smoothMouseY = THREE.MathUtils.lerp(state.smoothMouseY, state.mouseY, mouseEase);

        // Gentle idle breathing & curious glance
        const idleSeconds = (performance.now() - state.lastMouseMoveTime) / 1000;
        const idleBlend = THREE.MathUtils.clamp((idleSeconds - 2.0) / 2.5, 0, 1);

        const breathY = Math.sin(elapsed * 1.9) * 0.022;
        const idleYaw = Math.sin(elapsed * 0.85) * 0.09 * idleBlend;
        const idlePitch = Math.sin(elapsed * 1.25) * 0.042 * idleBlend;
        const idleRoll = Math.cos(elapsed * 0.7) * 0.028 * idleBlend;

        // Positioned in bottom-right: neutral head faces subtly left (-0.14) toward footer content
        const targetYaw = THREE.MathUtils.clamp(
          -0.14 + state.smoothMouseX * 0.72 + idleYaw,
          -0.95,
          0.68
        );
        const targetPitch = THREE.MathUtils.clamp(
          0.02 - state.smoothMouseY * 0.44 + idlePitch,
          -0.46,
          0.42
        );
        const targetRoll = THREE.MathUtils.clamp(
          -state.smoothMouseX * 0.11 + idleRoll,
          -0.15,
          0.15
        );

        const headEase = 1 - Math.exp(-7.5 * dt);
        state.currentYaw = THREE.MathUtils.lerp(state.currentYaw, targetYaw, headEase);
        state.currentPitch = THREE.MathUtils.lerp(state.currentPitch, targetPitch, headEase);
        state.currentRoll = THREE.MathUtils.lerp(state.currentRoll, targetRoll, headEase);

        // Spring-damper physics for happy click nod & bounce
        const stiffness = 175;
        const damping = 11.5;

        state.nodVel += (-stiffness * state.nodDisp - damping * state.nodVel) * dt;
        state.nodDisp += state.nodVel * dt;

        state.hopVel += (-stiffness * state.hopDisp - damping * state.hopVel) * dt;
        state.hopDisp += state.hopVel * dt;

        headPivot.rotation.order = 'YXZ';
        headPivot.rotation.y = state.currentYaw;
        headPivot.rotation.x = state.currentPitch + state.nodDisp * 0.14;
        headPivot.rotation.z = state.currentRoll;
        headPivot.position.y =
          headPivotBaseY + breathY + Math.max(-0.04, state.hopDisp * 0.06);

        // Eye micro-tracking inside screen
        const eyeTargetX = state.smoothMouseX * 0.055;
        const eyeTargetY = state.smoothMouseY * 0.038;
        eyeGroup.position.x = THREE.MathUtils.lerp(eyeGroup.position.x, eyeTargetX, headEase);
        eyeGroup.position.y = THREE.MathUtils.lerp(
          eyeGroup.position.y,
          0.095 + eyeTargetY,
          headEase
        );

        // Automatic blink + click double-blink
        if (state.activeBlinkProgress < 0) {
          if (state.blinkQueue.length > 0) {
            state.blinkQueue[0] -= dt;
            if (state.blinkQueue[0] <= 0) {
              state.blinkQueue.shift();
              state.activeBlinkProgress = 0;
            }
          } else {
            state.nextAutoBlinkTime -= dt;
            if (state.nextAutoBlinkTime <= 0) {
              state.activeBlinkProgress = 0;
              state.nextAutoBlinkTime = 3.0 + Math.random() * 3.0;
            }
          }
        }

        let blinkScaleY = 1.0;
        if (state.activeBlinkProgress >= 0) {
          const blinkDuration = 0.165;
          state.activeBlinkProgress += dt / blinkDuration;
          if (state.activeBlinkProgress >= 1.0) {
            state.activeBlinkProgress = -1;
            blinkScaleY = 1.0;
          } else {
            const s = Math.sin(state.activeBlinkProgress * Math.PI);
            blinkScaleY = 1.0 - s * 0.92;
          }
        }

        leftEye.scale.y = blinkScaleY;
        rightEye.scale.y = blinkScaleY;

        renderer.render(scene, camera);

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = window.requestAnimationFrame(tick);
        }
      } else {
        // Idle poll at low frequency while footer is hidden above the fold
        frameId = window.setTimeout(tick, 220);
      }
    };

    // Draw initial frame cleanly right away
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(tick);

    return () => {
      destroyed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('click', handleClick);
      resizeObserver?.disconnect();
      if (!resizeObserver) {
        window.removeEventListener('resize', handleResize);
      }
      io?.disconnect();

      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch {}
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-no-scroll-blur="true"
      role="button"
      tabIndex={0}
      aria-label="Interactive 3D cursor-following robot"
      title="click me"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          mountRef.current?.click();
        }
      }}
      className={`relative select-none cursor-pointer touch-manipulation ${className}`}
    />
  );
};
