import React, { useState } from 'react';
import { StatItem } from '../types';
import { AnimatedCounter } from './AnimatedCounter';
import { uiSfx } from '../utils/audio';

interface AnimatedStatCardProps {
  stat: StatItem;
  idx: number;
}

export function AnimatedStatCard({ stat, idx }: AnimatedStatCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => {
        setIsHovered(true);
        try {
          uiSfx.playHover();
        } catch {}
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      className="p-6 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-xs transition-all duration-300 space-y-2 group cursor-default select-none"
    >
      <div className="flex items-baseline gap-1 text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight font-mono-code">
        <AnimatedCounter
          value={stat.number}
          delay={idx * 120}
          duration={1300}
          triggerReplay={isHovered}
        />
        <span className="text-blue-600 group-hover:translate-x-1 transition-transform duration-300 ease-out inline-block">
          {stat.suffix}
        </span>
      </div>
      <div className="space-y-0.5">
        <div className="text-xs font-mono-code text-zinc-900 font-bold lowercase">
          {stat.label}
        </div>
        <div className="text-[11px] text-zinc-500 leading-relaxed lowercase">
          {stat.sublabel}
        </div>
      </div>
    </div>
  );
}
