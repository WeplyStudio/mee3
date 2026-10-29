export type Language = 'id' | 'en' | 'de' | 'ja';

export interface ProjectAchievement {
  number: string;
  title: string;
  description: string;
}

export interface ProjectScreen {
  id: string;
  title: string;
  caption: string;
  type: string;
  aspect?: string;
  imageUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  company: string;
  category: string;
  year: string;
  description: string;
  summary: string;
  role: string;
  type: string;
  tech: string;
  deliverables: string[];
  problem: string;
  decisions: string;
  impact: string;
  achievements: ProjectAchievement[];
  screens: ProjectScreen[];
  screenImages?: string[];
  metrics?: { label: string; value: string }[];
  imageType: 'zylo' | 'trufin' | 'krigstudio' | string;
  imageUrl?: string;
  liveUrl?: string;
  accentColor: string;
  nextProjectId: string;
  nextProjectTitle: string;
  order?: number;
  featured?: boolean;
}

export interface Principle {
  id: string;
  text: string;
}

export interface PhilosophyItem {
  number: string;
  title: string;
  headline: string;
  content: string;
}

export interface ServiceItem {
  number: string;
  title: string;
  category: string;
  description: string;
  deliverables: string[];
}

export interface StatItem {
  number: string;
  suffix?: string;
  label: string;
  sublabel: string;
}

export interface FAQItem {
  number: string;
  question: string;
  answer: string;
  tags?: string[];
}
