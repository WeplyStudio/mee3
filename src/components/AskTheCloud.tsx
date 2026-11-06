import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { Language } from '../types';
import { uiSfx } from '../utils/audio';

interface Props {
  lang: Language;
  onOpenContact?: () => void;
}

interface ChatTurn {
  role: 'user' | 'cloud';
  text: string;
}

const INITIAL_SUGGESTIONS: Record<Language, string[]> = {
  en: [
    "What's your design process?",
    "What are you working on now?",
    "How can I get in touch?",
  ],
  id: [
    "Bagaimana proses desain Anda?",
    "Apa proyek yang sedang dikerjakan?",
    "Bagaimana cara menghubungi Anda?",
  ],
  de: [
    "Wie sieht dein Designprozess aus?",
    "Woran arbeitest du gerade?",
    "Wie kann ich Kontakt aufnehmen?",
  ],
  ja: [
    "デザインのプロセスは？",
    "現在取り組んでいるプロジェクトは？",
    "連絡先を教えてください",
  ],
};

const PLACEHOLDERS: Record<Language, string> = {
  en: 'Ask the cloud anything else',
  id: 'Ask the cloud anything else',
  de: 'Ask the cloud anything else',
  ja: 'Ask the cloud anything else',
};

/**
 * Pixel-art dithered sky & cloud icon matching the reference design
 */
const PixelCloudIcon: React.FC<{ isThinking?: boolean }> = ({ isThinking = false }) => {
  return (
    <div
      className={`w-6 h-6 rounded-[2px] overflow-hidden shrink-0 select-none transition-transform duration-500 ${
        isThinking ? 'animate-pulse scale-105' : ''
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 8 8"
        className="w-full h-full"
        shapeRendering="crispEdges"
      >
        {/* Base Sky Blue */}
        <rect width="8" height="8" fill="#0d8bf2" />

        {/* Row 0 */}
        <rect x="0" y="0" width="2" height="1" fill="#0077e6" />
        <rect x="2" y="0" width="2" height="1" fill="#3da5ff" />
        <rect x="4" y="0" width="2" height="1" fill="#8ccbff" />
        <rect x="6" y="0" width="2" height="1" fill="#d9eeff" />

        {/* Row 1 */}
        <rect x="0" y="1" width="1" height="1" fill="#0077e6" />
        <rect x="1" y="1" width="2" height="1" fill="#63b8ff" />
        <rect x="3" y="1" width="2" height="1" fill="#1a94ff" />
        <rect x="5" y="1" width="2" height="1" fill="#b8e0ff" />
        <rect x="7" y="1" width="1" height="1" fill="#ffffff" />

        {/* Row 2 */}
        <rect x="0" y="2" width="2" height="1" fill="#47abff" />
        <rect x="2" y="2" width="2" height="1" fill="#ffffff" />
        <rect x="4" y="2" width="2" height="1" fill="#0080f0" />
        <rect x="6" y="2" width="2" height="1" fill="#0073db" />

        {/* Row 3 */}
        <rect x="0" y="3" width="3" height="1" fill="#0077e6" />
        <rect x="3" y="3" width="3" height="1" fill="#52b0ff" />
        <rect x="6" y="3" width="2" height="1" fill="#0080f0" />

        {/* Row 4 */}
        <rect x="0" y="4" width="4" height="1" fill="#70bfff" />
        <rect x="4" y="4" width="2" height="1" fill="#2b9bff" />
        <rect x="6" y="4" width="2" height="1" fill="#0077e6" />

        {/* Row 5 */}
        <rect x="0" y="5" width="3" height="1" fill="#52b0ff" />
        <rect x="3" y="5" width="2" height="1" fill="#cce8ff" />
        <rect x="5" y="5" width="3" height="1" fill="#0d8bf2" />

        {/* Row 6 */}
        <rect x="0" y="6" width="1" height="1" fill="#0077e6" />
        <rect x="1" y="6" width="2" height="1" fill="#ffffff" />
        <rect x="3" y="6" width="2" height="1" fill="#99d1ff" />
        <rect x="5" y="6" width="2" height="1" fill="#0077e6" />
        <rect x="7" y="6" width="1" height="1" fill="#cce8ff" />

        {/* Row 7 */}
        <rect x="0" y="7" width="1" height="1" fill="#0066cc" />
        <rect x="1" y="7" width="2" height="1" fill="#ffffff" />
        <rect x="3" y="7" width="2" height="1" fill="#b3dcff" />
        <rect x="5" y="7" width="1" height="1" fill="#3da5ff" />
        <rect x="6" y="7" width="2" height="1" fill="#ffffff" />
      </svg>
    </div>
  );
};

export const AskTheCloud: React.FC<Props> = ({ lang }) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [reply, setReply] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS[lang] || INITIAL_SUGGESTIONS.en);
  const [hasCustomSuggestions, setHasCustomSuggestions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync default suggestions when language changes if AI hasn't generated custom ones yet
  useEffect(() => {
    if (!hasCustomSuggestions) {
      setSuggestions(INITIAL_SUGGESTIONS[lang] || INITIAL_SUGGESTIONS.en);
    }
  }, [lang, hasCustomSuggestions]);

  const askCloud = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    uiSfx.playPop();
    setInputValue(trimmed);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          lang,
          history,
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok && data.reply) {
        setReply(data.reply);
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions.slice(0, 3));
          setHasCustomSuggestions(true);
        }
        setHistory((prev) => [
          ...prev.slice(-4),
          { role: 'user', text: trimmed },
          { role: 'cloud', text: data.reply },
        ]);
      } else {
        setReply(
          lang === 'id'
            ? 'Awan sedang berarak pelan saat ini. Silakan coba tanyakan kembali sesaat lagi.'
            : 'The cloud drifted out of reach for a moment. Please try asking again shortly.'
        );
      }
    } catch {
      setReply(
        lang === 'id'
          ? 'Gagal terhubung ke awan. Silakan periksa koneksi Anda dan coba lagi.'
          : 'Could not reach the cloud right now. Please try again in a moment.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    askCloud(inputValue);
  };

  return (
    <div className="pt-4 space-y-3 text-left">
      {/* Input Bar matching Screenshot 1 & 2 */}
      <form
        onSubmit={handleSubmit}
        className="w-full bg-[#f5f5f6] hover:bg-[#f0f0f2] focus-within:bg-[#f0f0f2] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3 transition-colors duration-200"
      >
        <PixelCloudIcon isThinking={isLoading} />

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            // If user clicks input after a reply was shown, select all so they can easily type a new question
            if (reply && inputRef.current) {
              inputRef.current.select();
            }
          }}
          placeholder={PLACEHOLDERS[lang] || PLACEHOLDERS.en}
          disabled={isLoading}
          aria-label="Ask the cloud anything about Jason's portfolio"
          className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:opacity-60 font-sans tracking-tight"
        />

        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          onMouseEnter={() => {
            if (inputValue.trim() && !isLoading) uiSfx.playHover();
          }}
          aria-label="Send question to the cloud"
          className={`w-7 h-7 min-w-7 min-h-7 aspect-square p-0 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
            inputValue.trim() && !isLoading
              ? 'bg-zinc-800 hover:bg-black text-white cursor-pointer active:scale-95'
              : 'bg-zinc-300 text-white cursor-default'
          }`}
        >
          <ArrowUp className="w-3.5 h-3.5 stroke-[2.25] shrink-0" />
        </button>
      </form>

      {/* Cloud Response Text Area (Matches Screenshot 2) */}
      {(isLoading || reply) && (
        <div className="px-2 sm:px-2.5 pt-1.5 pb-1 transition-all duration-300">
          {isLoading ? (
            <p className="text-xs sm:text-[13.5px] text-zinc-400 leading-relaxed animate-pulse font-sans">
              {lang === 'id' ? 'awan sedang merangkai jawaban...' : 'floating an answer down from the sky...'}
            </p>
          ) : (
            <p className="text-xs sm:text-[13.5px] text-zinc-600 leading-[1.65] font-sans">
              {reply}
            </p>
          )}
        </div>
      )}

      {/* Dynamic AI-Controlled Quick Reply Pill Buttons (Matches Screenshot 2) */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion}-${index}`}
              type="button"
              disabled={isLoading}
              onClick={() => askCloud(suggestion)}
              onMouseEnter={() => uiSfx.playHover()}
              className="px-3.5 py-2 rounded-full bg-[#f3f3f4] hover:bg-[#e7e7ea] text-zinc-700 hover:text-zinc-950 text-xs sm:text-[13px] font-normal tracking-tight transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-default text-left"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
