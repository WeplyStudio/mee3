import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Check } from 'lucide-react';
import {
  SiHtml5,
  SiCss,
  SiJavascript,
  SiTypescript,
  SiReact,
  SiNextdotjs,
  SiExpo,
  SiTailwindcss,
  SiAstro,
  SiRedux,
  SiGithub,
  SiGreensock,
  SiFramer,
  SiWebpack,
  SiVite,
  SiNodedotjs,
  SiDocker,
  SiFigma,
  SiThreedotjs
} from 'react-icons/si';
import { TbBrandAdobePhotoshop, TbBrandAdobeIllustrator } from 'react-icons/tb';
import { Language, Project } from '../types';
import { getProjectsData, getPhilosophyData, TRANSLATIONS } from '../data/portfolioData';
import { ScrollReveal } from './ScrollReveal';
import { AskTheCloud } from './AskTheCloud';
import { ShutterRevealImage } from './ShutterRevealImage';
import { ImageTooltip, getProjectTooltipText } from './ImageTooltip';
import { SiteImageSettings } from '../lib/firebase';

interface Props {
  lang: Language;
  onBack: () => void;
  onOpenContact: () => void;
  onSeeAllProjects?: () => void;
  onSelectProject?: (project: Project) => void;
  onOpenThoughts?: () => void;
  siteImages?: SiteImageSettings;
}

// Inline Web Audio Synthesizer for completion chime
const playSuccessSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    const now = ctx.currentTime;
    
    // Play a lovely high-fidelity design chime arpeggio
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.16); // C6
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.6);
  } catch (e) {
    // Ignore any audio context blocking/restrictions
  }
};

// Key points to trace the shape in 160x160 coordinates
const PUZZLE_POINTS = [
  { x: 50, y: 35 }, { x: 60, y: 35 }, { x: 70, y: 35 },
  { x: 80, y: 25 }, { x: 90, y: 35 }, { x: 100, y: 35 }, { x: 110, y: 35 },
  { x: 110, y: 55 }, { x: 120, y: 65 }, { x: 110, y: 75 },
  { x: 110, y: 95 }, { x: 110, y: 110 }, { x: 95, y: 110 },
  { x: 80, y: 120 }, { x: 70, y: 110 }, { x: 50, y: 110 },
  { x: 50, y: 95 }, { x: 40, y: 80 }, { x: 50, y: 65 }, { x: 50, y: 35 }
];

const PEN_POINTS = [
  { x: 80, y: 30 }, { x: 92, y: 62 }, { x: 105, y: 95 },
  { x: 90, y: 105 }, { x: 80, y: 135 }, { x: 70, y: 105 },
  { x: 55, y: 95 }, { x: 68, y: 62 }, { x: 80, y: 95 }, { x: 80, y: 115 }
];

const CHECKMARK_POINTS = [
  { x: 45, y: 85 }, { x: 53, y: 93 }, { x: 62, y: 102 },
  { x: 70, y: 110 }, { x: 80, y: 97 }, { x: 91, y: 84 },
  { x: 103, y: 70 }, { x: 115, y: 55 }
];

export const AboutMePage: React.FC<Props> = ({
  lang,
  onBack,
  onOpenContact,
  onSeeAllProjects,
  onSelectProject,
  onOpenThoughts,
  siteImages,
}) => {
  
  // Interactive drawing states
  const [completedShapes, setCompletedShapes] = useState<Record<string, boolean>>({
    puzzle: false,
    pen: false,
    checkmark: false
  });

  // Track coordinates drawn by user for each card
  const [paths, setPaths] = useState<Record<string, Array<{x: number, y: number}>>>({
    puzzle: [],
    pen: [],
    checkmark: []
  });

  const [activeCanvas, setActiveCanvas] = useState<string | null>(null);
  const [visitedPoints, setVisitedPoints] = useState<Record<string, Set<number>>>({
    puzzle: new Set(),
    pen: new Set(),
    checkmark: new Set()
  });

  const canvasRefs = {
    puzzle: useRef<SVGSVGElement>(null),
    pen: useRef<SVGSVGElement>(null),
    checkmark: useRef<SVGSVGElement>(null)
  };

  // Refs for the 3-stage scroll-linked photo choreography (Hero -> [who am i] -> [what i do])
  const storyStageRef = useRef<HTMLDivElement>(null);
  const slot1LeftRef = useRef<HTMLDivElement>(null);
  const slot1RightRef = useRef<HTMLDivElement>(null);
  const slot2LeftRef = useRef<HTMLDivElement>(null);
  const slot2RightRef = useRef<HTMLDivElement>(null);
  const slot3LeftRef = useRef<HTMLDivElement>(null);
  const slot3RightRef = useRef<HTMLDivElement>(null);
  const floatingLeftRef = useRef<HTMLDivElement>(null);
  const floatingRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    let rafId: number;
    let currentProgress = 0; // 0 = Stage 1 (Hero), 1 = Stage 2 ([who am i]), 2 = Stage 3 ([what i do])
    let initialized = false;

    const easeInOutCubic = (x: number) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const getSlotMetrics = (el: HTMLElement, stageRect: DOMRect) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - stageRect.left,
        y: r.top - stageRect.top,
        w: r.width,
        h: r.height,
        docCenterY: r.top + window.scrollY + r.height * 0.5,
      };
    };

    const updatePositions = () => {
      const stage = storyStageRef.current;
      const s1L = slot1LeftRef.current;
      const s1R = slot1RightRef.current;
      const s2L = slot2LeftRef.current;
      const s2R = slot2RightRef.current;
      const s3L = slot3LeftRef.current;
      const s3R = slot3RightRef.current;
      const fL = floatingLeftRef.current;
      const fR = floatingRightRef.current;

      if (stage && s1L && s1R && s2L && s2R && s3L && s3R && fL && fR) {
        const stageRect = stage.getBoundingClientRect();
        const m1L = getSlotMetrics(s1L, stageRect);
        const m1R = getSlotMetrics(s1R, stageRect);
        const m2L = getSlotMetrics(s2L, stageRect);
        const m2R = getSlotMetrics(s2R, stageRect);
        const m3L = getSlotMetrics(s3L, stageRect);
        const m3R = getSlotMetrics(s3R, stageRect);

        const vh = window.innerHeight;
        const scrollY = window.scrollY;

        // Scroll scrollY points where each stage is centered in the viewport
        const stage1DocY = (m1L.docCenterY + m1R.docCenterY) * 0.5;
        const stage2DocY = (m2L.docCenterY + m2R.docCenterY) * 0.5;
        const stage3DocY = (m3L.docCenterY + m3R.docCenterY) * 0.5;

        const start12 = Math.max(10, stage1DocY - vh * 0.45);
        const anchor2Scroll = stage2DocY - vh * 0.5;
        const end12 = Math.max(start12 + 80, anchor2Scroll - 30);

        const start23 = anchor2Scroll + 30;
        const anchor3Scroll = stage3DocY - vh * 0.5;
        const end23 = Math.max(start23 + 80, anchor3Scroll - 20);

        let targetProgress = 0;
        if (scrollY <= start12) {
          targetProgress = 0;
        } else if (scrollY < end12) {
          const raw = (scrollY - start12) / Math.max(1, end12 - start12);
          targetProgress = easeInOutCubic(Math.min(1, Math.max(0, raw)));
        } else if (scrollY <= start23) {
          targetProgress = 1;
        } else if (scrollY < end23) {
          const raw = (scrollY - start23) / Math.max(1, end23 - start23);
          targetProgress = 1 + easeInOutCubic(Math.min(1, Math.max(0, raw)));
        } else {
          targetProgress = 2;
        }

        if (!initialized) {
          currentProgress = targetProgress;
          initialized = true;
        } else {
          currentProgress += (targetProgress - currentProgress) * 0.16;
          if (Math.abs(targetProgress - currentProgress) < 0.001) {
            currentProgress = targetProgress;
          }
        }

        let leftX: number, leftY: number, leftW: number, leftH: number;
        let rightX: number, rightY: number, rightW: number, rightH: number, rightRot: number;

        if (currentProgress <= 1) {
          const t = currentProgress;
          leftX = lerp(m1L.x, m2L.x, t);
          leftY = lerp(m1L.y, m2L.y, t);
          leftW = lerp(m1L.w, m2L.w, t);
          leftH = lerp(m1L.h, m2L.h, t);

          rightX = lerp(m1R.x, m2R.x, t);
          rightY = lerp(m1R.y, m2R.y, t);
          rightW = lerp(m1R.w, m2R.w, t);
          rightH = lerp(m1R.h, m2R.h, t);
          rightRot = lerp(-2.2, 0, t);
        } else {
          const t = currentProgress - 1;
          leftX = lerp(m2L.x, m3L.x, t);
          leftY = lerp(m2L.y, m3L.y, t);
          leftW = lerp(m2L.w, m3L.w, t);
          leftH = lerp(m2L.h, m3L.h, t);

          rightX = lerp(m2R.x, m3R.x, t);
          rightY = lerp(m2R.y, m3R.y, t);
          rightW = lerp(m2R.w, m3R.w, t);
          rightH = lerp(m2R.h, m3R.h, t);
          rightRot = 0;
        }

        fL.style.width = `${leftW}px`;
        fL.style.height = `${leftH}px`;
        fL.style.transform = `translate3d(${leftX}px, ${leftY}px, 0)`;

        fR.style.width = `${rightW}px`;
        fR.style.height = `${rightH}px`;
        fR.style.transform = `translate3d(${rightX}px, ${rightY}px, 0) rotate(${rightRot}deg)`;
      }

      rafId = requestAnimationFrame(updatePositions);
    };

    rafId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePointerDown = (id: 'puzzle' | 'pen' | 'checkmark', e: React.PointerEvent<SVGSVGElement>) => {
    if (completedShapes[id]) return;
    const svg = canvasRefs[id].current;
    if (!svg) return;
    
    svg.setPointerCapture(e.pointerId);
    setActiveCanvas(id);
    
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 160;
    const y = ((e.clientY - rect.top) / rect.height) * 160;
    
    setPaths(prev => ({ ...prev, [id]: [{ x, y }] }));
    checkPoints(id, x, y);
  };

  const handlePointerMove = (id: 'puzzle' | 'pen' | 'checkmark', e: React.PointerEvent<SVGSVGElement>) => {
    if (activeCanvas !== id || completedShapes[id]) return;
    const svg = canvasRefs[id].current;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 160;
    const y = ((e.clientY - rect.top) / rect.height) * 160;
    
    setPaths(prev => ({ ...prev, [id]: [...(prev[id] || []), { x, y }] }));
    checkPoints(id, x, y);
  };

  const handlePointerUp = (id: 'puzzle' | 'pen' | 'checkmark', e: React.PointerEvent<SVGSVGElement>) => {
    if (activeCanvas !== id) return;
    setActiveCanvas(null);
    const svg = canvasRefs[id].current;
    if (svg) {
      svg.releasePointerCapture(e.pointerId);
    }

    // Evaluate completion
    const pointsList = id === 'puzzle' ? PUZZLE_POINTS : id === 'pen' ? PEN_POINTS : CHECKMARK_POINTS;
    const visited = visitedPoints[id];
    const percentage = visited.size / pointsList.length;

    if (percentage >= 0.75) {
      setCompletedShapes(prev => ({ ...prev, [id]: true }));
      playSuccessSound();
    } else {
      // Clear path if not completed
      setPaths(prev => ({ ...prev, [id]: [] }));
      setVisitedPoints(prev => ({ ...prev, [id]: new Set() }));
    }
  };

  const checkPoints = (id: 'puzzle' | 'pen' | 'checkmark', x: number, y: number) => {
    const pointsList = id === 'puzzle' ? PUZZLE_POINTS : id === 'pen' ? PEN_POINTS : CHECKMARK_POINTS;
    const visited = new Set(visitedPoints[id]);
    
    pointsList.forEach((pt, idx) => {
      const dist = Math.hypot(pt.x - x, pt.y - y);
      if (dist < 18) {
        visited.add(idx);
      }
    });

    setVisitedPoints(prev => ({ ...prev, [id]: visited }));

    // Instant check while moving
    if (visited.size === pointsList.length) {
      setCompletedShapes(prev => ({ ...prev, [id]: true }));
      playSuccessSound();
      setActiveCanvas(null);
    }
  };

  const resetCanvas = (id: 'puzzle' | 'pen' | 'checkmark') => {
    setCompletedShapes(prev => ({ ...prev, [id]: false }));
    setPaths(prev => ({ ...prev, [id]: [] }));
    setVisitedPoints(prev => ({ ...prev, [id]: new Set() }));
  };

  const texts = {
    id: {
      backHome: "kembali ke beranda",
      trust: "mempercayai",
      catchWhatMostSkip: "saya menangkap apa yang dilewatkan kebanyakan orang. dan saya tidak pernah terburu-buru.",
      whoAmITitle: "[siapa saya]",
      whoAmIContent: "saya steward jason. saat ini saya masih duduk di bangku sma (high school), dan saya sudah mulai belajar coding sejak kelas 6 sd. saya memulai perjalanan saya sejak 3 tahun terakhir — tepatnya saat kelas 2 smp — dengan membangun zylo, platform website hosting dengan harga terjangkau di mana saya bekerja sama dengan perusahaan lain sebagai penyedia infrastruktur. dari sanalah saya terpikat pada desain sekaligus pengembangan produk.",
      whatIDoTitle: "[apa yang saya lakukan]",
      whatIDoContentMain: "Saya mendesain antarmuka dan menulis kodenya sendiri. Saya tidak melihatnya sebagai dua pekerjaan terpisah.",
      whatIDoContentSub: "Saya membuat antarmuka produk, situs perusahaan, aplikasi seluler. Saya mengambil sebuah ide dan mengubahnya menjadi sesuatu yang berfungsi.",
      selectedWorksTitle: "[proyek pilihan]",
      selectedWorksSub: "beberapa hal yang telah saya buat.",
      seeAll: "• lihat semua",
      discoverMeTitle: "[jelajahi saya]",
      discoverMeSub: "gambar bentuk di bawah ini dan saya akan tunjukkan cara saya bekerja.",
      discovery01Title: "• penemuan 01",
      discovery01Shape: "gambar kepingan puzzle",
      discovery01Reveal: "Estetika: Menyatukan elemen kacau menjadi keseimbangan visual.",
      discovery02Title: "• penemuan 02",
      discovery02Shape: "gambar sebuah pena",
      discovery02Reveal: "Desain: Menerjemahkan pemikiran strategis ke dalam antarmuka nyata.",
      discovery03Title: "• penemuan 03",
      discovery03Shape: "gambar tanda centang",
      discovery03Reveal: "Eksekusi: Kode yang bersih, piksel-sempurna, dan sangat tangguh.",
      whatIWorkWith: "[teknologi yang digunakan]",
      nowTitle: "[sekarang]",
      nowItems: [
        "tinggal di indonesia",
        "sesekali menggambar",
        "banyak membaca, banyak berpikir",
        "sering melamun",
        "menyukai psikologi"
      ],
      collaborate: "Mari bangun bersama",
      readyText: "Siap untuk membangun sesuatu yang indah?",
    },
    en: {
      backHome: "back to home",
      trust: "trust",
      catchWhatMostSkip: "i catch what most skip. and i never rush it.",
      whoAmITitle: "[who am i]",
      whoAmIContent: "i'm steward jason. i'm currently in high school, and i first started learning to code back in 6th grade. i began my journey over the last 3 years — back in 8th grade (middle school) — by building zylo, an affordable website hosting platform where i partnered with infrastructure provider companies. while building it, i got hooked on design, and since then i both design and build.",
      whatIDoTitle: "[what i do]",
      whatIDoContentMain: "i design the interface and write its code myself. i don't see them as two separate jobs.",
      whatIDoContentSub: "i make product interfaces, corporate sites, mobile apps. i take an idea and turn it into something that works.",
      selectedWorksTitle: "[selected works]",
      selectedWorksSub: "a few of the things i've made.",
      seeAll: "• see all",
      discoverMeTitle: "[discover me]",
      discoverMeSub: "draw the shapes below and i'll show you how i work.",
      discovery01Title: "• discovery 01",
      discovery01Shape: "draw a puzzle piece",
      discovery01Reveal: "Aesthetics: Harmonizing chaotic elements into visual balance.",
      discovery02Title: "• discovery 02",
      discovery02Shape: "draw a pen",
      discovery02Reveal: "Design: Translating strategic thoughts into tactile interfaces.",
      discovery03Title: "• discovery 03",
      discovery03Shape: "draw a checkmark",
      discovery03Reveal: "Execution: Code is clean, pixel-perfect, and highly resilient.",
      whatIWorkWith: "[what i work with]",
      nowTitle: "[now]",
      nowItems: [
        "living in indonesia",
        "drawing now and then",
        "reading a lot, thinking a lot",
        "daydreaming plenty",
        "into psychology"
      ],
      collaborate: "Let's build together",
      readyText: "Ready to build something beautiful?",
    },
    de: {
      backHome: "zurück zur startseite",
      trust: "vertrauen",
      catchWhatMostSkip: "ich erfasse, was die meisten übersehen. und ich überstürze nichts.",
      whoAmITitle: "[wer ich bin]",
      whoAmIContent: "ich bin steward jason. derzeit gehe ich noch zur high school (oberstufe), habe aber bereits in der 6. klasse mit dem programmieren begonnen. meine reise startete vor 3 jahren in der 8. klasse (middle school) mit dem aufbau von zylo — einer erschwinglichen webhosting-plattform in zusammenarbeit mit infrastruktur-partnerunternehmen. seitdem gestalte und entwickle ich digitale produkte.",
      whatIDoTitle: "[was ich tue]",
      whatIDoContentMain: "Ich entwerfe das Interface und schreibe den Code selbst. Für mich sind das keine zwei getrennten Berufe.",
      whatIDoContentSub: "Ich baue Produkt-Interfaces, Unternehmensseiten und mobile Apps. Ich nehme eine Idee und mache daraus ein funktionierendes Produkt.",
      selectedWorksTitle: "[ausgewählte arbeiten]",
      selectedWorksSub: "einige ausgewählte projekte.",
      seeAll: "• alle ansehen",
      discoverMeTitle: "[entdecke mich]",
      discoverMeSub: "zeichne die formen unten und erfahre, wie ich arbeite.",
      discovery01Title: "• entdeckung 01",
      discovery01Shape: "zeichne ein puzzleteil",
      discovery01Reveal: "Ästhetik: Chaotische Elemente in visuelle Ausgewogenheit bringen.",
      discovery02Title: "• entdeckung 02",
      discovery02Shape: "zeichne einen stift",
      discovery02Reveal: "Design: Strategische Gedanken in haptische Interfaces übersetzen.",
      discovery03Title: "• entdeckung 03",
      discovery03Shape: "zeichne ein häkchen",
      discovery03Reveal: "Exekution: Sauberer, pixelgenauer und hochgradig resilienter Code.",
      whatIWorkWith: "[technologien]",
      nowTitle: "[aktuell]",
      nowItems: [
        "wohnhaft in indonesien",
        "ab und zu am zeichnen",
        "viel am lesen und nachdenken",
        "begeistert von psychologie"
      ],
      collaborate: "Lassen Sie uns zusammenarbeiten",
      readyText: "Bereit, etwas Großartiges zu erschaffen?",
    },
    ja: {
      backHome: "ホームに戻る",
      trust: "信頼",
      catchWhatMostSkip: "多くの人が見落とす細部に気づき、決して妥協しません。",
      whoAmITitle: "[私について]",
      whoAmIContent: "スチュワード・ジェイソンです。現在は高校生（ハイスクール在学中）で、小学6年生（6th grade）の頃からプログラミングを学び始めました。3年前の中学2年生（8th grade）の時に、インフラ提供企業と提携して手頃な価格のWebホスティングプラットフォーム「Zylo」を構築したのが私の旅の始まりです。それ以来、デザインと開発の両方を手掛けています。",
      whatIDoTitle: "[提供価値]",
      whatIDoContentMain: "インターフェースのデザインから実装までを一貫して行います。分断のないシームレスなモノづくりを追求しています。",
      whatIDoContentSub: "プロダクトUI、企業サイト、モバイルアプリなど、抽象的なアイデアを実用的なプロダクトへ昇華させます。",
      selectedWorksTitle: "[代表作]",
      selectedWorksSub: "これまでに手掛けた実績の一部です。",
      seeAll: "• すべて見る",
      discoverMeTitle: "[インタラクティブ探索]",
      discoverMeSub: "下の枠内に図形を描いて、私の仕事の流儀をアンロックしてください。",
      discovery01Title: "• 探求 01",
      discovery01Shape: "パズルのピースを描く",
      discovery01Reveal: "美意識: 複雑な要素を視覚的な調和へと整えます。",
      discovery02Title: "• 探求 02",
      discovery02Shape: "ペンを描く",
      discovery02Reveal: "デザイン: 戦略的思考を心地よいUIへと具現化します。",
      discovery03Title: "• 探求 03",
      discovery03Shape: "チェックマークを描く",
      discovery03Reveal: "実装力: 堅牢でピクセル単位に精密なコードを書きます。",
      whatIWorkWith: "[使用ツール・技術]",
      nowTitle: "[現在の関心]",
      nowItems: [
        "インドネシア在住",
        "デザインのスケッチ",
        "読書と思索の日々",
        "認知心理学の研究"
      ],
      collaborate: "共に創りましょう",
      readyText: "新しいプロジェクトを始めませんか？",
    }
  };

  const t = texts[lang] || texts.en;
  const tMaster = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const projects = getProjectsData(lang);
  const philosophy = getPhilosophyData(lang);

  // Professional tech stack icon pack using react-icons
  const techLogos = [
    { name: 'HTML5', svg: <SiHtml5 size={20} /> },
    { name: 'CSS3', svg: <SiCss size={20} /> },
    { name: 'JavaScript', svg: <SiJavascript size={20} /> },
    { name: 'TypeScript', svg: <SiTypescript size={20} /> },
    { name: 'React', svg: <SiReact size={20} /> },
    { name: 'Next.js', svg: <SiNextdotjs size={20} /> },
    { name: 'Expo', svg: <SiExpo size={20} /> },
    { name: 'Tailwind CSS', svg: <SiTailwindcss size={20} /> },
    { name: 'Astro', svg: <SiAstro size={20} /> },
    { name: 'Redux', svg: <SiRedux size={20} /> },
    { name: 'GitHub', svg: <SiGithub size={20} /> },
    { name: 'GSAP', svg: <SiGreensock size={20} /> },
    { name: 'Framer Motion', svg: <SiFramer size={20} /> },
    { name: 'Three.js', svg: <SiThreedotjs size={20} /> },
    { name: 'Webpack', svg: <SiWebpack size={20} /> },
    { name: 'Vite', svg: <SiVite size={20} /> },
    { name: 'Node.js', svg: <SiNodedotjs size={20} /> },
    { name: 'Docker', svg: <SiDocker size={20} /> },
    { name: 'Figma', svg: <SiFigma size={20} /> },
    { name: 'Photoshop', svg: <TbBrandAdobePhotoshop size={22} /> },
    { name: 'Illustrator', svg: <TbBrandAdobeIllustrator size={22} /> }
  ];

  return (
    <div className="min-h-screen bg-white text-[#121212] pt-24 pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col justify-between relative">
      
      <div className="space-y-[250px]">
        
        {/* 3-STAGE SCROLL-LINKED PHOTO CHOREOGRAPHY (HERO -> [WHO AM I] -> [WHAT I DO]) */}
        <div
          ref={storyStageRef}
          data-gsap-custom="true"
          className="relative"
        >
          {/* FLOATING MORPHING PHOTO 1 (LEFT / MIDDLE IN STAGE 1 -> FAR LEFT IN STAGE 2 -> INNER LEFT IN STAGE 3) */}
          <div
            ref={floatingLeftRef}
            className="absolute top-0 left-0 z-20 overflow-hidden border border-zinc-200/60 shadow-md bg-zinc-100 will-change-transform origin-top-left"
          >
            <ImageTooltip isMe={true} lang={lang} className="w-full h-full">
              <img
                src="/profile-3.webp"
                srcSet="/profile-3-400.webp 400w, /profile-3-600.webp 600w, /profile-3.webp 800w"
                sizes="(max-width: 640px) 50vw, 360px"
                alt="steward jason"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover grayscale contrast-110 hover:scale-105 transition-transform duration-700"
              />
            </ImageTooltip>
          </div>

          {/* FLOATING MORPHING PHOTO 2 (RIGHT TILTED IN STAGE 1 -> FAR RIGHT IN STAGE 2 -> INNER RIGHT IN STAGE 3) */}
          <div
            ref={floatingRightRef}
            className="absolute top-0 left-0 z-20 overflow-hidden border border-zinc-200/60 shadow-md bg-zinc-900 will-change-transform origin-center"
          >
            <ImageTooltip isMe={true} lang={lang} className="w-full h-full">
              <img
                src={siteImages?.aboutImage || '/profile-2.webp'}
                srcSet={siteImages?.aboutImage ? undefined : '/profile-2-400.webp 400w, /profile-2.webp 600w'}
                sizes="(max-width: 640px) 50vw, 360px"
                alt="steward jason portrait"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover grayscale contrast-115 hover:scale-105 transition-transform duration-700"
              />
            </ImageTooltip>
          </div>

          {/* STAGE 1: EDITORIAL COLLAGE AT TOP OF ABOUT ME (FULL VIEWPORT SCENE + EXTRA SEPARATION BEFORE STAGE 2) */}
          <div className="min-h-[82vh] flex items-center py-6 sm:py-10 mb-[320px] sm:mb-[360px]">
            <div className="w-full grid grid-cols-2 md:grid-cols-12 gap-6 sm:gap-8 md:gap-12 items-start">
              {/* Column 1 (Left Statement) */}
              <div className="col-span-2 md:col-span-4 space-y-6 flex flex-col justify-start md:pt-16">
                <ScrollReveal distance={24}>
                  <div className="space-y-4 pt-1">
                    <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-[#111111] leading-tight">
                      i <span className="font-serif italic text-zinc-400 font-light">{t.trust}</span> my eye, not my hands.
                    </h1>
                    <p className="text-xs sm:text-[13px] text-zinc-400 font-mono-code leading-relaxed">
                      {t.catchWhatMostSkip}
                    </p>
                  </div>
                </ScrollReveal>
              </div>

              {/* Column 2 (Stage 1 Slot Left) */}
              <div className="col-span-1 md:col-span-4 flex flex-col justify-start md:pt-4">
                <div
                  ref={slot1LeftRef}
                  className="aspect-[3/4] w-full sm:w-[88%] mx-auto pointer-events-none opacity-0"
                  aria-hidden="true"
                />
              </div>

              {/* Column 3 (Stage 1 Slot Right - Offset lower on desktop) */}
              <div className="col-span-1 md:col-span-4 flex flex-col justify-start pt-8 md:pt-20">
                <div
                  ref={slot1RightRef}
                  className="aspect-[3/4] w-full sm:w-[88%] mx-auto pointer-events-none opacity-0"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* STAGE 2: [who am i] FLANKED BY THE TWO PHOTOS ON FAR LEFT & FAR RIGHT */}
          <div className="py-4 sm:py-6 mb-[250px]">
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
              {/* Far Left Slot 2 */}
              <div className="w-full md:w-auto flex justify-start md:block">
                <div
                  ref={slot2LeftRef}
                  className="w-24 sm:w-28 md:w-[112px] aspect-[3/4] shrink-0 pointer-events-none opacity-0"
                  aria-hidden="true"
                />
              </div>

              {/* Center [who am i] Content */}
              <div className="flex-1 max-w-2xl mx-auto w-full px-1 sm:px-4">
                <ScrollReveal distance={24}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-10 items-start">
                    <div className="md:col-span-4 font-mono-code text-xs sm:text-[13px] text-zinc-400 lowercase tracking-wider text-left">
                      {t.whoAmITitle}
                    </div>
                    <div className="md:col-span-8">
                      <div className="text-[13.5px] sm:text-sm text-zinc-700 leading-relaxed font-normal lowercase space-y-4 text-left">
                        <p>
                          <span className="font-semibold text-zinc-900">hi</span>{' '}
                          <span className="inline-block animate-wave origin-[70%_70%] text-base">👋</span>{' '}
                          <span className="text-zinc-400">—</span>{' '}
                          {t.whoAmIContent}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              {/* Far Right Slot 2 */}
              <div className="w-full md:w-auto flex justify-end md:block">
                <div
                  ref={slot2RightRef}
                  className="w-24 sm:w-28 md:w-[112px] aspect-[3/4] shrink-0 pointer-events-none opacity-0"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* STAGE 3: [what i do] TIGHTLY FRAMED BY THE TWO PHOTOS IN THE CENTER */}
          <div className="py-4 sm:py-6">
            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-16 max-w-3xl mx-auto">
              {/* Inner Left Slot 3 */}
              <div className="flex justify-center">
                <div
                  ref={slot3LeftRef}
                  className="w-28 sm:w-[120px] aspect-[3/4] shrink-0 pointer-events-none opacity-0"
                  aria-hidden="true"
                />
              </div>

              {/* Center [what i do] Description */}
              <div className="max-w-xs sm:max-w-[310px] text-center px-2 py-4 z-10">
                <ScrollReveal distance={24}>
                  <div className="space-y-4">
                    <div className="font-mono-code text-[11px] text-zinc-400 lowercase tracking-widest">
                      {t.whatIDoTitle}
                    </div>
                    <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed text-zinc-600 font-normal lowercase">
                      <p className="font-semibold text-zinc-900 leading-relaxed">{t.whatIDoContentMain}</p>
                      <p className="text-zinc-400 leading-relaxed">{t.whatIDoContentSub}</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              {/* Inner Right Slot 3 */}
              <div className="flex justify-center">
                <div
                  ref={slot3RightRef}
                  className="w-28 sm:w-[120px] aspect-[3/4] shrink-0 pointer-events-none opacity-0"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: [selected works] SUMMARY */}
        <ScrollReveal distance={28}>
          <div className="py-4 sm:py-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 max-w-4xl mx-auto items-start">
              {/* Left Column: [selected works] label & subtitle */}
              <div className="md:col-span-4 space-y-3 text-left">
                <div className="font-mono-code text-xs sm:text-[13px] text-zinc-400 lowercase tracking-wider">
                  {t.selectedWorksTitle}
                </div>
                <p className="text-xs sm:text-[13.5px] text-zinc-800 font-sans leading-relaxed lowercase">
                  {t.selectedWorksSub}
                </p>
              </div>

              {/* Right Column: Numbered List & See All button */}
              <div className="md:col-span-8 space-y-6">
                <div className="space-y-6">
                  {projects.slice(0, 3).map((proj, idx) => (
                    <div
                      key={proj.id}
                      onClick={() => {
                        if (onSelectProject) onSelectProject(proj);
                      }}
                      className="flex items-start gap-4 group cursor-pointer"
                    >
                      <span className="font-mono-code text-xs text-zinc-400 shrink-0 w-5 pt-0.5">0{idx + 1}</span>
                      <div className="space-y-0.5">
                        <h3 className="text-xs sm:text-[14px] font-bold text-zinc-900 group-hover:underline lowercase leading-snug">
                          {proj.title}
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-sans lowercase">
                          {proj.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-start">
                  <button
                    onClick={onSeeAllProjects}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] bg-zinc-200/70 hover:bg-zinc-300/80 text-zinc-900 font-sans text-xs font-medium cursor-pointer transition-colors lowercase"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span>
                    <span>{t.seeAll}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* SECTION 6: [discover me] INTERACTIVE CANVAS DRAWING BOARDS */}
        <ScrollReveal distance={28}>
          <div className="py-4 sm:py-6">
            <div className="text-center space-y-2 mb-12">
              <span className="font-mono-code text-[11px] text-zinc-400 lowercase tracking-widest block">{t.discoverMeTitle}</span>
              <p className="text-xs sm:text-sm text-zinc-400 font-mono-code max-w-md mx-auto lowercase">{t.discoverMeSub}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Card 1: Puzzle Piece */}
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[240px] space-y-3 text-center">
                  <div className="flex items-center justify-between text-[11px] font-mono-code text-zinc-400 lowercase">
                    <span>{t.discovery01Title}</span>
                    {completedShapes.puzzle && <span className="text-emerald-600 flex items-center gap-1"><Check size={11} /> Ok</span>}
                  </div>
                  <div className="text-xs font-mono-code font-semibold text-zinc-800 lowercase">{t.discovery01Shape}</div>
                  
                  {/* Board Drawing Window */}
                  <div 
                    className={`relative aspect-square w-full border border-dashed rounded-2xl select-none touch-none overflow-hidden transition-all duration-300 ${
                      completedShapes.puzzle 
                        ? 'bg-emerald-50/20 border-emerald-300' 
                        : 'bg-white border-zinc-300 hover:border-zinc-500'
                    }`}
                    style={{
                      backgroundImage: 'radial-gradient(circle, #e2e8f0 1.2px, transparent 1.2px)',
                      backgroundSize: '16px 16px'
                    }}
                  >
                    <svg
                      ref={canvasRefs.puzzle}
                      viewBox="0 0 160 160"
                      className="w-full h-full cursor-crosshair"
                      onPointerDown={(e) => handlePointerDown('puzzle', e)}
                      onPointerMove={(e) => handlePointerMove('puzzle', e)}
                      onPointerUp={(e) => handlePointerUp('puzzle', e)}
                    >
                      {/* Outline trace */}
                      <path
                        d="M 50,35 H 70 C 70,25 90,25 90,35 H 110 V 55 C 120,55 120,75 110,75 V 110 H 90 C 90,120 70,120 70,110 H 50 V 90 C 40,90 40,70 50,70 Z"
                        className={`fill-none stroke-2 transition-colors ${completedShapes.puzzle ? 'stroke-emerald-500 stroke-2' : 'stroke-zinc-300/80 stroke-dash'}`}
                        strokeDasharray={completedShapes.puzzle ? "none" : "4,4"}
                      />
                      
                      {/* User's path */}
                      {paths.puzzle.length > 1 && (
                        <path
                          d={`M ${paths.puzzle[0].x},${paths.puzzle[0].y} ` + paths.puzzle.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke={completedShapes.puzzle ? 'transparent' : '#18181b'}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Completion glow dots */}
                      {PUZZLE_POINTS.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={visitedPoints.puzzle.has(idx) ? "2.5" : "1.5"}
                          className={`transition-colors duration-300 ${
                            completedShapes.puzzle 
                              ? 'fill-emerald-500' 
                              : visitedPoints.puzzle.has(idx) 
                                ? 'fill-zinc-800' 
                                : 'fill-transparent'
                          }`}
                        />
                      ))}
                    </svg>

                    {/* Reset Button on hover */}
                    {completedShapes.puzzle && (
                      <button
                        onClick={() => resetCanvas('puzzle')}
                        className="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-zinc-600 border border-zinc-200 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
                        title="Reset canvas"
                      >
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>

                  {/* Secret content revealed */}
                  <div className="h-10">
                    {completedShapes.puzzle ? (
                      <p className="text-[11px] font-mono-code text-emerald-700 animate-in fade-in slide-in-from-bottom-2 duration-300 lowercase">
                        {t.discovery01Reveal}
                      </p>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-mono-code">---</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Pen */}
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[240px] space-y-3 text-center">
                  <div className="flex items-center justify-between text-[11px] font-mono-code text-zinc-400 lowercase">
                    <span>{t.discovery02Title}</span>
                    {completedShapes.pen && <span className="text-emerald-600 flex items-center gap-1"><Check size={11} /> Ok</span>}
                  </div>
                  <div className="text-xs font-mono-code font-semibold text-zinc-800 lowercase">{t.discovery02Shape}</div>
                  
                  {/* Board Drawing Window */}
                  <div 
                    className={`relative aspect-square w-full border border-dashed rounded-2xl select-none touch-none overflow-hidden transition-all duration-300 ${
                      completedShapes.pen 
                        ? 'bg-emerald-50/20 border-emerald-300' 
                        : 'bg-white border-zinc-300 hover:border-zinc-500'
                    }`}
                    style={{
                      backgroundImage: 'radial-gradient(circle, #e2e8f0 1.2px, transparent 1.2px)',
                      backgroundSize: '16px 16px'
                    }}
                  >
                    <svg
                      ref={canvasRefs.pen}
                      viewBox="0 0 160 160"
                      className="w-full h-full cursor-crosshair"
                      onPointerDown={(e) => handlePointerDown('pen', e)}
                      onPointerMove={(e) => handlePointerMove('pen', e)}
                      onPointerUp={(e) => handlePointerUp('pen', e)}
                    >
                      {/* Outline trace */}
                      <path
                        d="M 80,30 L 105,95 L 90,105 L 80,135 L 70,105 L 55,95 Z M 80,30 L 80,135 M 55,95 L 105,95"
                        className={`fill-none stroke-2 transition-colors ${completedShapes.pen ? 'stroke-emerald-500 stroke-2' : 'stroke-zinc-300/80 stroke-dash'}`}
                        strokeDasharray={completedShapes.pen ? "none" : "4,4"}
                      />
                      
                      {/* User's path */}
                      {paths.pen.length > 1 && (
                        <path
                          d={`M ${paths.pen[0].x},${paths.pen[0].y} ` + paths.pen.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke={completedShapes.pen ? 'transparent' : '#18181b'}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Completion glow dots */}
                      {PEN_POINTS.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={visitedPoints.pen.has(idx) ? "2.5" : "1.5"}
                          className={`transition-colors duration-300 ${
                            completedShapes.pen 
                              ? 'fill-emerald-500' 
                              : visitedPoints.pen.has(idx) 
                                ? 'fill-zinc-800' 
                                : 'fill-transparent'
                          }`}
                        />
                      ))}
                    </svg>

                    {/* Reset Button on hover */}
                    {completedShapes.pen && (
                      <button
                        onClick={() => resetCanvas('pen')}
                        className="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-zinc-600 border border-zinc-200 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
                        title="Reset canvas"
                      >
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>

                  {/* Secret content revealed */}
                  <div className="h-10">
                    {completedShapes.pen ? (
                      <p className="text-[11px] font-mono-code text-emerald-700 animate-in fade-in slide-in-from-bottom-2 duration-300 lowercase">
                        {t.discovery02Reveal}
                      </p>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-mono-code">---</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Checkmark inside Circle layout */}
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[240px] space-y-3 text-center">
                  <div className="flex items-center justify-between text-[11px] font-mono-code text-zinc-400 lowercase">
                    <span>{t.discovery03Title}</span>
                    {completedShapes.checkmark && <span className="text-emerald-600 flex items-center gap-1"><Check size={11} /> Ok</span>}
                  </div>
                  <div className="text-xs font-mono-code font-semibold text-zinc-800 lowercase">{t.discovery03Shape}</div>
                  
                  {/* Board Drawing Window */}
                  <div 
                    className={`relative aspect-square w-full border border-dashed rounded-2xl select-none touch-none overflow-hidden transition-all duration-300 ${
                      completedShapes.checkmark 
                        ? 'bg-emerald-50/20 border-emerald-300' 
                        : 'bg-white border-zinc-300 hover:border-zinc-500'
                    }`}
                    style={{
                      backgroundImage: 'radial-gradient(circle, #e2e8f0 1.2px, transparent 1.2px)',
                      backgroundSize: '16px 16px'
                    }}
                  >
                    <svg
                      ref={canvasRefs.checkmark}
                      viewBox="0 0 160 160"
                      className="w-full h-full cursor-crosshair"
                      onPointerDown={(e) => handlePointerDown('checkmark', e)}
                      onPointerMove={(e) => handlePointerMove('checkmark', e)}
                      onPointerUp={(e) => handlePointerUp('checkmark', e)}
                    >
                      {/* Circle outline background */}
                      <circle 
                        cx="80" 
                        cy="80" 
                        r="45" 
                        fill="none" 
                        stroke="#e4e4e7" 
                        strokeWidth="1.5" 
                        strokeDasharray="3,3" 
                      />

                      {/* Outline checkmark trace */}
                      <path
                        d="M 45,85 L 70,110 L 115,55"
                        className={`fill-none stroke-2 transition-colors ${completedShapes.checkmark ? 'stroke-emerald-500 stroke-2' : 'stroke-zinc-300/80 stroke-dash'}`}
                        strokeDasharray={completedShapes.checkmark ? "none" : "4,4"}
                      />
                      
                      {/* User's path */}
                      {paths.checkmark.length > 1 && (
                        <path
                          d={`M ${paths.checkmark[0].x},${paths.checkmark[0].y} ` + paths.checkmark.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke={completedShapes.checkmark ? 'transparent' : '#18181b'}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Completion glow dots */}
                      {CHECKMARK_POINTS.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={visitedPoints.checkmark.has(idx) ? "2.5" : "1.5"}
                          className={`transition-colors duration-300 ${
                            completedShapes.checkmark 
                              ? 'fill-emerald-500' 
                              : visitedPoints.checkmark.has(idx) 
                                ? 'fill-zinc-800' 
                                : 'fill-transparent'
                          }`}
                        />
                      ))}
                    </svg>

                    {/* Reset Button on hover */}
                    {completedShapes.checkmark && (
                      <button
                        onClick={() => resetCanvas('checkmark')}
                        className="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-zinc-600 border border-zinc-200 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
                        title="Reset canvas"
                      >
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>

                  {/* Secret content revealed */}
                  <div className="h-10">
                    {completedShapes.checkmark ? (
                      <p className="text-[11px] font-mono-code text-emerald-700 animate-in fade-in slide-in-from-bottom-2 duration-300 lowercase">
                        {t.discovery03Reveal}
                      </p>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-mono-code">---</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </ScrollReveal>

        {/* SECTION 7: [what i work with] TECH ICONS GRID */}
        <ScrollReveal distance={28}>
          <div className="py-4 sm:py-6 text-center">
            <div className="space-y-1.5 mb-10">
              <span className="font-mono-code text-[11px] text-zinc-400 lowercase tracking-widest block">{t.whatIWorkWith}</span>
            </div>

            <div className="flex flex-col items-center justify-center max-w-2xl mx-auto">
              <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 text-zinc-500">
                {techLogos.map((tech) => (
                  <div
                    key={tech.name}
                    aria-label={tech.name}
                    className="w-12 h-12 sm:w-13 sm:h-13 bg-zinc-50/60 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-xl border border-zinc-200/70 hover:border-zinc-900 flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 cursor-default"
                  >
                    {tech.svg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* SECTION 8: [now] */}
        <ScrollReveal distance={28}>
          <div className="py-4 sm:py-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 max-w-4xl mx-auto items-start">
              {/* Left Column: [now] label */}
              <div className="md:col-span-4 font-mono-code text-xs sm:text-[13px] text-zinc-400 lowercase tracking-wider text-left">
                {t.nowTitle}
              </div>

              {/* Right Column: items list */}
              <div className="md:col-span-8">
                <div className="space-y-3.5 text-xs sm:text-[13.5px] text-zinc-800 font-normal lowercase text-left">
                  {t.nowItems.map((item, index) => (
                    <div key={index} className="hover:text-black transition-colors py-0.5">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* SECTION 9: [thought] SUMMARY */}
        <ScrollReveal distance={28}>
          <div className="py-4 sm:py-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 max-w-4xl mx-auto items-start">
              <div className="md:col-span-4 font-mono-code text-xs sm:text-[13px] text-zinc-400 lowercase tracking-wider text-left">
                {tMaster.thoughtLabel}
              </div>
              <div className="md:col-span-8 space-y-6 text-left">
                <div className="text-xs sm:text-[13.5px] text-zinc-700 leading-relaxed lowercase text-left">
                  {tMaster.thoughtIntro}
                </div>

                <div className="space-y-4 pt-2">
                  {philosophy.map((item, index) => (
                    <div
                      key={item.number}
                      className={`border-b border-zinc-200/40 pb-4 ${
                        index > 0 ? 'opacity-70 hover:opacity-100 transition-opacity' : ''
                      }`}
                    >
                      <div className="flex items-baseline gap-4">
                        <span className="text-xs font-mono-code text-zinc-400">{item.number}</span>
                        <span className="text-sm font-bold text-zinc-900 lowercase">{item.title}</span>
                      </div>
                      {index === 0 && (
                        <p className="text-xs text-zinc-500 italic mt-1.5 pl-8 max-w-lg lowercase">
                          {item.headline}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {onOpenThoughts && (
                  <div className="pt-2 flex justify-start">
                    <button
                      onClick={onOpenThoughts}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] bg-zinc-200/70 hover:bg-zinc-300/80 text-zinc-900 font-sans text-xs font-medium cursor-pointer transition-colors lowercase"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span>
                      <span>{tMaster.readHowIThink}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* SECTION 10: ASK THE CLOUD */}
        <ScrollReveal distance={28}>
          <div className="py-4 sm:py-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 max-w-4xl mx-auto items-start">
              <div className="md:col-span-4 font-mono-code text-xs sm:text-[13px] text-zinc-400 lowercase tracking-wider text-left">
                [the cloud]
              </div>
              <div className="md:col-span-8 text-left -mt-8 sm:-mt-10">
                <AskTheCloud lang={lang} />
              </div>
            </div>
          </div>
        </ScrollReveal>

      </div>

    </div>
  );
};
