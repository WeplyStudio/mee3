import React from 'react';
import MarqueeAlongSvgPath from '@/components/ui/marquee-along-svg-path';
import { ImageTooltip } from './ImageTooltip';

interface VisualCurationMarqueeProps {
  lang?: 'id' | 'en' | 'de' | 'ja';
}

const imgs = [
  {
    src: 'https://cdn.cosmos.so/b9909337-7a53-48bc-9672-33fbd0f040a1?format=webp&w=100&q=60',
    title: 'Typography & Form',
  },
  {
    src: 'https://cdn.cosmos.so/ecdc9dd7-2862-4c28-abb1-dcc0947390f3?format=webp&w=100&q=60',
    title: 'Editorial Design',
  },
  {
    src: 'https://cdn.cosmos.so/79de41ec-baa4-4ac0-a9a4-c090005ca640?format=webp&w=100&q=60',
    title: 'Mori Typeface',
  },
  {
    src: 'https://cdn.cosmos.so/1a18b312-21cd-4484-bce5-9fb7ed1c5e01?format=webp&w=100&q=60',
    title: 'Ampersand Study',
  },
  {
    src: 'https://cdn.cosmos.so/d765f64f-7a66-462f-8b2d-3d7bc8d7db55?format=webp&w=100&q=60',
    title: 'Minimal Artifact',
  },
  {
    src: 'https://cdn.cosmos.so/6b9f08ea-f0c5-471f-a620-71221ff1fb65?format=webp&w=100&q=60',
    title: 'Type Exploration',
  },
  {
    src: 'https://cdn.cosmos.so/40a09525-4b00-4666-86f0-3c45f5d77605?format=webp&w=100&q=60',
    title: 'Spatial Balance',
  },
  {
    src: 'https://cdn.cosmos.so/14f05ab6-b4d0-4605-9007-8a2190a249d0?format=webp&w=100&q=60',
    title: 'Form & Light',
  },
  {
    src: 'https://cdn.cosmos.so/d05009a2-a2f8-4a4c-a0de-e1b0379dddb8?format=webp&w=100&q=60',
    title: 'Mono Aesthetics',
  },
  {
    src: 'https://cdn.cosmos.so/ba646e35-efc2-494a-961b-b40f597e6fc9?format=webp&w=100&q=60',
    title: 'Godfrey Dadich',
  },
  {
    src: 'https://cdn.cosmos.so/e899f9c3-ed48-4899-8c16-fbd5a60705da?format=webp&w=100&q=60',
    title: 'Geometry & Rhythm',
  },
  {
    src: 'https://cdn.cosmos.so/24e83c11-c607-45cd-88fb-5059960b56a0?format=webp&w=100&q=60',
    title: 'Print Culture',
  },
  {
    src: 'https://cdn.cosmos.so/cd346bce-f415-4ea7-8060-99c5f7c1741a?format=webp&w=100&q=60',
    title: 'Organic Motion',
  },
];

// Desktop panoramic gentle wave
const desktopPath =
  'M-50 140 C 250 250, 500 50, 800 160 C 1100 270, 1350 70, 1650 150';

// Mobile-optimized wave: centered at y=150 with gentle amplitudes (130-170) inside 300 viewBox height
const mobilePath =
  'M-40 150 C 110 185, 190 115, 300 150 C 410 185, 490 115, 640 150';

export const VisualCurationMarquee: React.FC<VisualCurationMarqueeProps> = ({ lang = 'en' }) => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section className="relative w-screen left-1/2 -translate-x-1/2 py-8 sm:py-10 my-4 overflow-hidden bg-white">
      {/* Viewport marquee with ample headroom preventing card clipping */}
      <div className="w-full h-[250px] sm:h-[260px] md:h-[280px] relative flex items-center justify-center select-none">
        <MarqueeAlongSvgPath
          key={isMobile ? 'mobile' : 'desktop'}
          path={isMobile ? mobilePath : desktopPath}
          viewBox={isMobile ? '0 0 600 300' : '0 0 1600 260'}
          preserveAspectRatio="none"
          baseVelocity={isMobile ? 4 : 5}
          useScrollVelocity={true}
          scrollSpringConfig={{ damping: 30, stiffness: 120 }}
          slowdownOnHover={true}
          slowDownFactor={0.25}
          draggable={true}
          repeat={isMobile ? 1 : 2}
          dragSensitivity={0.12}
          className="w-full h-full"
          responsive
          responsiveFit="width"
          minScale={0.7}
          grabCursor
        >
          {imgs.map((img, i) => (
            <div
              key={i}
              className="group/item relative -translate-x-1/2 -translate-y-1/2"
            >
              <ImageTooltip tooltip={img.title.toLowerCase()} lang={lang} className="w-16 sm:w-20 md:w-22 aspect-[3/4]">
                <div className="w-full h-full rounded-lg overflow-hidden bg-white p-1 sm:p-1.5 border border-zinc-200/90 shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:scale-115 hover:z-50 group-hover/item:border-zinc-900">
                  <img
                    src={img.src}
                    alt={img.title}
                    width="88"
                    height="117"
                    decoding="async"
                    className="w-full h-full object-cover rounded select-none pointer-events-none transition-transform duration-500 group-hover/item:scale-105"
                    draggable={false}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </ImageTooltip>
            </div>
          ))}
        </MarqueeAlongSvgPath>
      </div>
    </section>
  );
};

export default VisualCurationMarquee;
