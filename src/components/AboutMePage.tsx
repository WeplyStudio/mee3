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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
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
      whoAmIContent: "Saya Steward Jason, saya sempat belajar teknik elektro dan berhenti di tahun ketiga. Saya mulai coding, dan saat coding saya terpikat pada desain. Lalu saatnya memulai hal saya sendiri. Pada tahun 2023 saya mendirikan Skynotech di Indonesia. Sejak saat itu saya mendesain sekaligus membangun.",
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
      whoAmIContent: "I'm steward jason, i was studying electrical engineering and quit in my third year. i started coding, and while coding i got hooked on design. then it was time for my own thing. in 2023 i started skynotech in indonesia. since then i both design and build.",
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
      whoAmIContent: "Ich bin Steward Jason. Ich habe Elektrotechnik studiert und im dritten Jahr abgebrochen, um mich ganz dem Programmieren und Design zu widmen. 2023 habe ich Skynotech in Indonesien gegründet. Seitdem gestalte und entwickle ich digitale Systeme.",
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
      whoAmIContent: "スチュワード・ジェイソンと申します。大学で電気工学を専攻後、コードとデザインの世界に没頭しました。2023年にインドネシアでSkynotechを設立し、UI/UX設計とフロントエンド開発を一貫して手掛けています。",
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
    <div className="min-h-screen bg-white text-[#121212] pt-24 pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col justify-between animate-in fade-in duration-700 relative">
      
      <div className="space-y-36 sm:space-y-56 md:space-y-72">
        
        {/* SECTION 1: EDITORIAL 3-PHOTO COLLAGE AS IN THE SCREENSHOT & VIDEO */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start my-16 sm:my-28">
          {/* Column 1 (Left) */}
          <div className="md:col-span-4 space-y-8 flex flex-col justify-start">
            {/* Top Left Photo - Hidden on mobile, shown on desktop */}
            <div className="hidden md:block aspect-[3/4] w-full sm:w-[90%] overflow-hidden">
            </div>

            {/* Typography statement below top-left photo */}
            <ScrollReveal delay={120} distance={20}>
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

          {/* Column 2 (Middle) */}
          <div className="md:col-span-4 flex flex-col justify-start md:pt-28">
            <div className="aspect-[3/4] w-full sm:w-[90%] mx-auto overflow-hidden border border-zinc-200/50 shadow-md">
              <ImageTooltip isMe={true} lang={lang} className="w-full h-full">
                <ShutterRevealImage
                  src="/profile-3.webp"
                  srcSet="/profile-3-400.webp 400w, /profile-3-600.webp 600w, /profile-3.webp 800w"
                  sizes="(max-width: 640px) 100vw, 360px"
                  alt="steward jason child"
                  delay={0.15}
                  className="w-full h-full"
                  imgClassName="w-full h-full object-cover grayscale contrast-110 hover:scale-105 transition-transform duration-700"
                />
              </ImageTooltip>
            </div>
          </div>

          {/* Column 3 (Right) - Offset nicely on desktop */}
          <div className="hidden md:flex md:col-span-4 flex-col justify-start md:pt-48">
            <div className="aspect-[3/4] w-full overflow-hidden border border-zinc-200/50 shadow-xs rotate-[-1.5deg] hover:rotate-0 transition-transform duration-700">
              <ImageTooltip isMe={true} lang={lang} className="w-full h-full">
                <ShutterRevealImage
                  src={siteImages?.aboutImage || '/profile-2.webp'}
                  srcSet={siteImages?.aboutImage ? undefined : '/profile-2-400.webp 400w, /profile-2.webp 600w'}
                  sizes="360px"
                  alt="steward jason portrait"
                  delay={0.25}
                  className="w-full h-full"
                  imgClassName="w-full h-full object-cover grayscale contrast-115 hover:scale-105 transition-transform duration-700"
                />
              </ImageTooltip>
            </div>
          </div>
        </div>

        {/* SECTION 3: [who am i] */}
        <div className="my-36 sm:my-52 md:my-64 py-12 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 max-w-4xl mx-auto items-start">
            <div className="md:col-span-4 font-mono-code text-xs sm:text-[13px] text-zinc-400 lowercase tracking-wider text-left">
              {t.whoAmITitle}
            </div>
            <div className="md:col-span-8">
              <ScrollReveal delay={100} distance={20}>
                <div className="text-[13.5px] sm:text-sm text-zinc-700 leading-relaxed font-normal lowercase space-y-4 text-left">
                  <p>{t.whoAmIContent}</p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* SECTION 4: [what i do] COLLAGE & DESCRIPTION IN THE CENTER */}
        <div className="my-36 sm:my-52 md:my-64 py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative py-8">
            
            {/* Left Photo Pair (4 cols) */}
            <div className="lg:col-span-4 flex items-center justify-center gap-4 relative">
              <div className="w-24 sm:w-28 aspect-[3/4] bg-zinc-200 overflow-hidden relative border border-zinc-200 shadow-xs z-10 mt-8">
                <ImageTooltip isMe={true} lang={lang} className="w-full h-full">
                  <ShutterRevealImage
                    src={siteImages?.aboutImage || '/profile-2.webp'}
                    srcSet={siteImages?.aboutImage ? undefined : '/profile-2-400.webp 400w, /profile-2.webp 600w'}
                    sizes="120px"
                    alt="smiling portrait"
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover grayscale"
                  />
                </ImageTooltip>
              </div>
            </div>

            {/* Center: Description Text */}
            <div className="lg:col-span-4 text-center px-4 space-y-4 z-10 bg-white/90 py-4">
              <div className="font-mono-code text-[11px] text-zinc-400 lowercase tracking-widest">
                {t.whatIDoTitle}
              </div>
              <ScrollReveal delay={150} distance={20}>
                <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed text-zinc-600 font-normal lowercase">
                  <p className="font-medium text-zinc-900 leading-normal">{t.whatIDoContentMain}</p>
                  <p className="text-zinc-500 leading-normal">{t.whatIDoContentSub}</p>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Photo Pair (4 cols) */}
            <div className="lg:col-span-4 flex items-center justify-center gap-4 relative">
              <div className="w-24 sm:w-28 aspect-[3/4] bg-zinc-200 overflow-hidden relative border border-zinc-200 shadow-xs z-10">
                <ImageTooltip isMe={true} lang={lang} className="w-full h-full">
                  <ShutterRevealImage
                    src={siteImages?.heroImage || '/profile-3.webp'}
                    srcSet={siteImages?.heroImage ? undefined : '/profile-3-400.webp 400w, /profile-3-600.webp 600w, /profile-3.webp 800w'}
                    sizes="120px"
                    alt="clay mask selfie"
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover grayscale contrast-125"
                  />
                </ImageTooltip>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 5: [selected works] SUMMARY */}
        <div className="my-36 sm:my-52 md:my-64 py-12 sm:py-20">
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
              <ScrollReveal delay={100} distance={20}>
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
              </ScrollReveal>

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

        {/* SECTION 6: [discover me] INTERACTIVE CANVAS DRAWING BOARDS */}
        <div className="my-36 sm:my-52 md:my-64 py-12 sm:py-20">
          <div className="text-center space-y-2 mb-12">
            <span className="font-mono-code text-[11px] text-zinc-400 lowercase tracking-widest block">{t.discoverMeTitle}</span>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono-code max-w-md mx-auto lowercase">{t.discoverMeSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Puzzle Piece */}
            <ScrollReveal delay={100} distance={25} className="flex flex-col items-center">
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
            </ScrollReveal>

            {/* Card 2: Pen */}
            <ScrollReveal delay={180} distance={25} className="flex flex-col items-center">
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
            </ScrollReveal>

            {/* Card 3: Checkmark inside Circle layout */}
            <ScrollReveal delay={260} distance={25} className="flex flex-col items-center">
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
            </ScrollReveal>

          </div>
        </div>

        {/* SECTION 7: [what i work with] TECH ICONS GRID */}
        <div className="my-36 sm:my-52 md:my-64 py-12 sm:py-20 text-center">
          <div className="space-y-1.5 mb-10">
            <span className="font-mono-code text-[11px] text-zinc-400 lowercase tracking-widest block">{t.whatIWorkWith}</span>
          </div>

          <ScrollReveal delay={150} distance={20}>
            <div className="flex flex-col items-center justify-center gap-6 max-w-2xl mx-auto">
              
              {/* Row 1 and Row 2 compiled flex layout */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-zinc-400">
                {techLogos.map((tech) => (
                  <div 
                    key={tech.name} 
                    className="p-3.5 bg-white hover:bg-black hover:text-white rounded-2xl border border-zinc-200/80 hover:border-black flex items-center justify-center transition-all duration-300 hover:scale-105 group relative cursor-pointer shadow-xs"
                  >
                    {tech.svg}
                    
                    {/* Tooltip */}
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-mono-code px-2 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md z-10">
                      {tech.name}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </ScrollReveal>
        </div>

        {/* SECTION 8: [now] */}
        <div className="my-36 sm:my-52 md:my-64 py-12 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 max-w-4xl mx-auto items-start">
            {/* Left Column: [now] label */}
            <div className="md:col-span-4 font-mono-code text-xs sm:text-[13px] text-zinc-400 lowercase tracking-wider text-left">
              {t.nowTitle}
            </div>

            {/* Right Column: items list */}
            <div className="md:col-span-8">
              <ScrollReveal delay={100} distance={15}>
                <div className="space-y-3.5 text-xs sm:text-[13.5px] text-zinc-800 font-normal lowercase text-left">
                  {t.nowItems.map((item, index) => (
                    <div key={index} className="hover:text-black transition-colors py-0.5">
                      {item}
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* SECTION 9: [thought] SUMMARY */}
        <div className="my-36 sm:my-52 md:my-64 py-12 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 max-w-4xl mx-auto items-start">
            <div className="md:col-span-4 font-mono-code text-xs sm:text-[13px] text-zinc-400 lowercase tracking-wider text-left">
              {tMaster.thoughtLabel}
            </div>
            <div className="md:col-span-8 space-y-6 text-left">
              <ScrollReveal delay={100} distance={20}>
                <div className="text-xs sm:text-[13.5px] text-zinc-700 leading-relaxed lowercase text-left">
                  {tMaster.thoughtIntro}
                </div>
              </ScrollReveal>

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

      </div>

    </div>
  );
};
