import React, { useState, useEffect } from 'react';
import { getProjectsData, TRANSLATIONS } from '../data/portfolioData';
import { ProjectMockup } from './ProjectMockup';
import { ScrollReveal } from './ScrollReveal';
import { InteractiveBrandName } from './InteractiveBrandName';
import { ImageTooltip, getProjectTooltipText } from './ImageTooltip';
import { Language, Project } from '../types';

interface ProjectsPageProps {
  lang: Language;
  onBack: () => void;
  onOpenContact: () => void;
  onSelectProject: (project: Project) => void;
  customProjects?: Project[];
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  lang,
  onBack,
  onOpenContact,
  onSelectProject,
  customProjects,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const projects = customProjects && customProjects.length > 0 ? customProjects : getProjectsData(lang);
  const [activeFilterId, setActiveFilterId] = useState<'all' | 'web' | 'fintech' | 'invitation'>('all');

  const filters: Array<{ id: 'all' | 'web' | 'fintech' | 'invitation'; label: string }> = [
    { id: 'all', label: t.all },
    { id: 'web', label: t.filterWeb },
    { id: 'fintech', label: t.filterFintech },
    { id: 'invitation', label: t.filterInvitation }
  ];

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Filter logic
  const filteredProjects = projects.filter((project) => {
    if (activeFilterId === 'all') return true;
    if (activeFilterId === 'web') {
      return project.id === 'zylo';
    }
    if (activeFilterId === 'fintech') {
      return project.id === 'trufin';
    }
    if (activeFilterId === 'invitation') {
      return project.id === 'krigstudio';
    }
    return true;
  });

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-7xl mx-auto px-6 sm:px-12">
      
      {/* Header Info Row matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 sm:pb-16 items-start">
        {/* Left Column Label */}
        <div className="md:col-span-3">
          <ScrollReveal delay={100} distance={20}>
            <div className="text-xs sm:text-[13px] font-mono-code text-zinc-400 lowercase">
              [{t.works}]
            </div>
          </ScrollReveal>
        </div>

        {/* Right Column Intro Text */}
        <div className="md:col-span-9">
          <ScrollReveal delay={180} distance={25}>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-3xl lowercase">
              {lang === 'id'
                ? 'koleksi kurasi proyek unggulan yang saya bangun — zylo (perusahaan website hosting & platform cloud), trufin (web verifikasi keaslian instansi keuangan & pinjol), dan krigstudio (platform web pembuat undangan digital). fokus saya adalah arsitektur kode yang bersih dan antarmuka yang bermakna.'
                : lang === 'de'
                ? 'eine kuratierte auswahl meiner leitprojekte: zylo (web-hosting & cloud-plattform), trufin (verifizierungsplattform für finanzinstitute & online-kredite) und krigstudio (plattform für digitale einladungen). mein fokus liegt auf sauberer architektur und intuitiven interfaces.'
                : lang === 'ja'
                ? '手掛けた代表的な3つのプロジェクト（zylo：Webホスティング、trufin：金融機関・融資検証プラットフォーム、krigstudio：デジタル招待状ビルダー）のケーススタディです。複雑な技術を明快で美しいインターフェースへと昇華させました。'
                : "a curated selection of core platforms i've founded, designed, and built — zylo (high-performance web hosting), trufin (financial institution & loan verification), and krigstudio (digital invitation creator). crafted with clean code architecture and intentional interfaces."}
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Filter Nav List matching screenshot style */}
      <ScrollReveal delay={250} distance={15}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-12 text-xs sm:text-[13px] font-mono-code text-zinc-400 select-none">
          {filters.map((filter) => {
            const isActive = activeFilterId === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilterId(filter.id)}
                className={`transition-colors flex items-center gap-1.5 cursor-pointer hover:text-black py-1 ${
                  isActive ? 'text-zinc-900 font-semibold' : 'text-zinc-400'
                }`}
              >
                <span>•</span>
                <span className="lowercase">{filter.label}</span>
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Projects Grid matching screenshot */}
      <div className="py-12">
        {filteredProjects.length === 0 ? (
          <div className="py-24 text-center text-zinc-400 text-xs font-mono-code lowercase">
            {t.noProjects}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {filteredProjects.map((project, idx) => (
              <ScrollReveal key={project.id} delay={idx * 60} distance={0}>
                <div
                  onClick={() => onSelectProject(project)}
                  className="group cursor-pointer flex flex-col justify-between h-full hover:bg-zinc-50 transition-all duration-300 relative overflow-hidden rounded-xl"
                >
                  {/* High fidelity mockup frame */}
                  <div className="w-full aspect-[4/3] relative overflow-hidden bg-[#090a0f] rounded-xl">
                    <ImageTooltip tooltip={getProjectTooltipText(project.id, lang)} lang={lang} className="w-full h-full">
                      <ProjectMockup type={project.imageType} imageUrl={project.imageUrl} />
                    </ImageTooltip>
                  </div>

                  {/* Caption & Metadata below */}
                  <div className="p-4 sm:p-5 space-y-1.5">
                    <div className="text-xs sm:text-[13px] font-bold text-zinc-950 group-hover:text-blue-700 transition-colors lowercase leading-tight">
                      {project.title}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono-code lowercase">
                      <span>{project.client}</span>
                      {project.liveUrl && (
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-zinc-500 group-hover:text-zinc-900 transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{project.liveUrl.replace(/^https?:\/\//, '')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>

      {/* Editorial Statement Section [not the end] */}
      <section className="py-28 sm:py-36 md:py-44 px-6 text-center max-w-2xl mx-auto space-y-7 sm:space-y-9">
        <ScrollReveal delay={100} distance={20}>
          <div className="text-[12px] sm:text-xs text-zinc-400 font-mono-code lowercase tracking-wider">
            {t.buildTag || '[not the end]'}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={160} distance={25}>
          <InteractiveBrandName
            shortName={t.buildBrand || 'jason'}
            fullName={t.buildFullName || 'steward jason liuwindra'}
          />
        </ScrollReveal>

        <ScrollReveal delay={220} distance={20}>
          <div className="space-y-3 pt-2 sm:pt-4">
            <h3 className="text-xl sm:text-2xl md:text-3xl text-zinc-900 font-light tracking-tight leading-snug max-w-md mx-auto lowercase">
              {t.buildHeading}
            </h3>
            <p className="text-xs sm:text-[13px] text-zinc-400 font-light lowercase pt-1">
              {t.buildSub}
            </p>
          </div>
        </ScrollReveal>
      </section>

    </div>
  );
};
