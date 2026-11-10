import React, { useEffect } from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { SiInstagram, SiWhatsapp } from 'react-icons/si';
import { Language, Project } from '../types';
import { getProjectsData } from '../data/portfolioData';
import { ScrollReveal } from './ScrollReveal';
import { uiSfx } from '../utils/audio';

interface BioPageProps {
  lang: Language;
  onNavigateHome: () => void;
  onSelectProject: (project: Project) => void;
  onOpenContact: () => void;
}

export const BioPage: React.FC<BioPageProps> = ({
  lang,
  onNavigateHome,
  onSelectProject,
  onOpenContact,
}) => {
  const projects = getProjectsData(lang);
  const zyloProject = projects.find((p) => p.id === 'zylo') || projects[0];
  const trufinProject = projects.find((p) => p.id === 'trufin') || projects[1] || projects[0];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const labels = {
    id: {
      portfolioTitle: 'Jason',
      portfolioSub: 'jayss.id',
      zyloTitle: 'Zylo',
      zyloSub: 'Cloud & Web Hosting',
      trufinTitle: 'Trufin.',
      trufinSub: 'Verifikasi Fintech & Pinjol',
      krigTitle: 'Buat Undangan Digital',
      krigSub: 'krigstudio.my.id',
      whatsappTitle: 'WhatsApp',
      whatsappSub: '+62 888-0894-3176',
      instagramTitle: 'Instagram',
      instagramSub: '@jasonn.doc',
      emailTitle: 'Email',
      emailSub: 'hello@jayss.id',
      contactTitle: 'Hubungi Saya',
      contactSub: 'jayss.id/contact',
    },
    en: {
      portfolioTitle: 'Jason',
      portfolioSub: 'jayss.id',
      zyloTitle: 'Zylo',
      zyloSub: 'Cloud & Web Hosting',
      trufinTitle: 'Trufin.',
      trufinSub: 'Fintech Verification',
      krigTitle: 'Digital Invitations — Krigstudio',
      krigSub: 'krigstudio.my.id',
      whatsappTitle: 'WhatsApp',
      whatsappSub: '+62 888-0894-3176',
      instagramTitle: 'Instagram',
      instagramSub: '@jasonn.doc',
      emailTitle: 'Email',
      emailSub: 'hello@jayss.id',
      contactTitle: 'Get in Touch',
      contactSub: 'jayss.id/contact',
    },
    de: {
      portfolioTitle: 'Jason',
      portfolioSub: 'jayss.id',
      zyloTitle: 'Zylo',
      zyloSub: 'Cloud & Web-Hosting',
      trufinTitle: 'Trufin.',
      trufinSub: 'Fintech-Verifizierung',
      krigTitle: 'Digitale Einladungen — Krigstudio',
      krigSub: 'krigstudio.my.id',
      whatsappTitle: 'WhatsApp',
      whatsappSub: '+62 888-0894-3176',
      instagramTitle: 'Instagram',
      instagramSub: '@jasonn.doc',
      emailTitle: 'E-Mail',
      emailSub: 'hello@jayss.id',
      contactTitle: 'Kontakt',
      contactSub: 'jayss.id/contact',
    },
    ja: {
      portfolioTitle: 'Jason',
      portfolioSub: 'jayss.id',
      zyloTitle: 'Zylo',
      zyloSub: 'クラウド & Webホスティング',
      trufinTitle: 'Trufin.',
      trufinSub: 'フィンテック検証基盤',
      krigTitle: 'デジタル招待状 — Krigstudio',
      krigSub: 'krigstudio.my.id',
      whatsappTitle: 'WhatsApp',
      whatsappSub: '+62 888-0894-3176',
      instagramTitle: 'Instagram',
      instagramSub: '@jasonn.doc',
      emailTitle: 'メール',
      emailSub: 'hello@jayss.id',
      contactTitle: 'お問い合わせ',
      contactSub: 'jayss.id/contact',
    },
  };

  const t = labels[lang] || labels.en;

  const linkItems = [
    {
      id: 'krigstudio',
      title: t.krigTitle,
      subtitle: t.krigSub,
      href: 'https://krigstudio.my.id',
      iconBg: 'bg-zinc-900',
      icon: (
        <span className="font-sans font-extrabold text-[15px] text-white tracking-tighter select-none">
          K.
        </span>
      ),
    },
    {
      id: 'whatsapp',
      title: t.whatsappTitle,
      subtitle: t.whatsappSub,
      href: 'https://wa.me/6288808943176',
      iconBg: 'bg-[#25D366]',
      icon: (
        <span className="text-white flex items-center justify-center">
          <SiWhatsapp size={20} />
        </span>
      ),
    },
    {
      id: 'instagram',
      title: t.instagramTitle,
      subtitle: t.instagramSub,
      href: 'https://instagram.com/jasonn.doc',
      iconBg: 'bg-zinc-900',
      icon: (
        <span className="text-white flex items-center justify-center">
          <SiInstagram size={18} />
        </span>
      ),
    },
    {
      id: 'email',
      title: t.emailTitle,
      subtitle: t.emailSub,
      href: 'mailto:hello@jayss.id',
      iconBg: 'bg-zinc-900',
      icon: <Mail className="w-[18px] h-[18px] text-white" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#121212] pt-24 sm:pt-28 pb-20 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-[500px] mx-auto w-full space-y-3.5">
        {/* 1. TOP LARGE PROFILE / PORTFOLIO CARD */}
        <ScrollReveal distance={24}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              uiSfx.playClick();
              onNavigateHome();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                uiSfx.playClick();
                onNavigateHome();
              }
            }}
            className="w-full h-[210px] sm:h-[230px] rounded-[24px] bg-[#fafafa] hover:bg-[#f4f4f5] border border-zinc-200/90 hover:border-zinc-300 px-7 sm:px-9 py-6 flex items-center relative overflow-hidden group cursor-pointer transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
          >
            {/* Subtle radial highlight */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(0,0,0,0.02),transparent_65%)] pointer-events-none" />

            {/* Top Right Arrow */}
            <div className="absolute top-6 right-6 z-10">
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
            </div>

            {/* Horizontal Profile Row: Avatar on Left + Jason (Verified) & jayss.id on Right */}
            <div className="relative z-10 flex items-center gap-5 sm:gap-6">
              <div className="w-24 h-24 sm:w-[108px] sm:h-[108px] rounded-full overflow-hidden bg-[#201d1c] ring-4 ring-white border border-zinc-200/80 shadow-[0_12px_30px_rgba(0,0,0,0.12)] shrink-0 group-hover:scale-105 transition-transform duration-500">
                <img
                  src="/profile-3.webp"
                  srcSet="/profile-3-400.webp 400w, /profile-3-600.webp 600w, /profile-3.webp 800w"
                  sizes="112px"
                  alt="Steward Jason Liuwindra"
                  className="w-full h-full object-cover object-center grayscale contrast-115"
                />
              </div>

              <div className="text-left space-y-1">
                <div className="flex items-center gap-2 text-lg sm:text-[21px] font-semibold text-zinc-900 tracking-tight leading-snug">
                  <span>{t.portfolioTitle}</span>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[19px] h-[19px] sm:w-[21px] sm:h-[21px] text-[#1d9bf0] shrink-0"
                    fill="currentColor"
                    aria-label="Verified"
                  >
                    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                  </svg>
                </div>
                <div className="text-[14px] sm:text-[15.5px] text-zinc-500 font-normal leading-snug">
                  {t.portfolioSub}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* 2. MIDDLE TWO-COLUMN BENTO ROW (ZYLO & TRUFIN USING EACH PROJECT'S ACTUAL IMAGE) */}
        <ScrollReveal distance={24}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Left Card: Zylo Project Image */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                uiSfx.playClick();
                if (zyloProject) {
                  onSelectProject(zyloProject);
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && zyloProject) {
                  e.preventDefault();
                  uiSfx.playClick();
                  onSelectProject(zyloProject);
                }
              }}
              className="h-[205px] sm:h-[215px] rounded-[24px] bg-zinc-900 border border-zinc-200/90 hover:border-zinc-400 p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
            >
              {/* Actual Zylo Project Image */}
              <img
                src={zyloProject?.imageUrl || '/zylo.webp'}
                srcSet="/zylo-600.webp 600w, /zylo-900.webp 900w, /zylo.webp 1200w"
                sizes="(max-width: 640px) 100vw, 250px"
                alt={t.zyloTitle}
                className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
                loading="lazy"
              />
              {/* Bottom gradient overlay for crisp text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/15 pointer-events-none" />

              {/* Top Right Arrow */}
              <div className="flex justify-end relative z-10">
                <div className="w-7 h-7 rounded-full bg-black/35 backdrop-blur-xs flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-white/90 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                </div>
              </div>

              {/* Bottom Left Title & Subtitle */}
              <div className="relative z-10 text-left space-y-0.5 mt-auto">
                <div className="text-[15px] font-semibold text-white tracking-tight leading-snug">
                  {t.zyloTitle}
                </div>
                <div className="text-[12.5px] text-zinc-200/90 font-normal leading-snug">
                  {t.zyloSub}
                </div>
              </div>
            </div>

            {/* Right Card: Trufin Project Image */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                uiSfx.playClick();
                if (trufinProject) {
                  onSelectProject(trufinProject);
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && trufinProject) {
                  e.preventDefault();
                  uiSfx.playClick();
                  onSelectProject(trufinProject);
                }
              }}
              className="h-[205px] sm:h-[215px] rounded-[24px] bg-zinc-900 border border-zinc-200/90 hover:border-zinc-400 p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
            >
              {/* Actual Trufin Project Image */}
              <img
                src={trufinProject?.imageUrl || '/trufin.webp'}
                srcSet="/trufin-600.webp 600w, /trufin-900.webp 900w, /trufin.webp 1200w"
                sizes="(max-width: 640px) 100vw, 250px"
                alt={t.trufinTitle}
                className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
                loading="lazy"
              />
              {/* Bottom gradient overlay for crisp text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/15 pointer-events-none" />

              {/* Top Right Arrow */}
              <div className="flex justify-end relative z-10">
                <div className="w-7 h-7 rounded-full bg-black/35 backdrop-blur-xs flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-white/90 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                </div>
              </div>

              {/* Bottom Left Title & Subtitle */}
              <div className="relative z-10 text-left space-y-0.5 mt-auto">
                <div className="text-[15px] font-semibold text-white tracking-tight leading-snug">
                  {t.trufinTitle}
                </div>
                <div className="text-[12.5px] text-zinc-200/90 font-normal leading-snug">
                  {t.trufinSub}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* 3. STACK OF HORIZONTAL LINK CARDS (KRIGSTUDIO, WHATSAPP, INSTAGRAM, EMAIL, /CONTACT) */}
        <ScrollReveal distance={24}>
          <div className="space-y-3">
            {linkItems.map((item) => {
              const isMailto = item.href.startsWith('mailto:');
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target={isMailto ? undefined : '_blank'}
                  rel={isMailto ? undefined : 'noopener noreferrer'}
                  onClick={() => uiSfx.playClick()}
                  className="w-full rounded-[20px] bg-[#fafafa] hover:bg-[#f4f4f5] border border-zinc-200/90 hover:border-zinc-300 px-4 py-3.5 flex items-center justify-between transition-all duration-300 group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${item.iconBg}`}
                    >
                      {item.icon}
                    </div>
                    <div className="text-left truncate">
                      <div className="text-[14px] font-semibold text-zinc-900 tracking-tight leading-tight truncate">
                        {item.title}
                      </div>
                      <div className="text-[12.5px] text-zinc-500 font-normal leading-tight mt-0.5 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0 ml-3" />
                </a>
              );
            })}

            {/* Direct /contact Page Row */}
            <button
              type="button"
              onClick={() => {
                uiSfx.playClick();
                onOpenContact();
              }}
              className="w-full rounded-[20px] bg-[#fafafa] hover:bg-[#f4f4f5] border border-zinc-200/90 hover:border-zinc-300 px-4 py-3.5 flex items-center justify-between transition-all duration-300 group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-[12px] bg-zinc-900 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <span className="font-mono-code text-xs font-bold text-white">[ ]</span>
                </div>
                <div className="text-left truncate">
                  <div className="text-[14px] font-semibold text-zinc-900 tracking-tight leading-tight truncate">
                    {t.contactTitle}
                  </div>
                  <div className="text-[12.5px] text-zinc-500 font-normal leading-tight mt-0.5 truncate">
                    {t.contactSub}
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0 ml-3" />
            </button>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};
