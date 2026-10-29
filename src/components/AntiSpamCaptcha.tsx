import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, Check, ShieldAlert } from 'lucide-react';
import { Language } from '../types';

export interface CaptchaRef {
  validate: () => boolean;
  getHoneypotValue: () => string;
  isBotSuspected: () => boolean;
  reset: () => void;
}

interface AntiSpamCaptchaProps {
  lang: Language;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
  variant?: 'box' | 'conversational';
}

interface CaptchaQuestion {
  num1: number;
  num2: number;
  operator: '+' | '-' | '×';
  answer: number;
}

const LOCALIZED_CAPTCHA_TEXT: Record<
  Language,
  {
    proveHumanPrefix: string;
    mathPlaceholder: string;
    refreshTooltip: string;
    verified: string;
    incorrect: string;
    emptyWarning: string;
    securityNote: string;
  }
> = {
  id: {
    proveHumanPrefix: 'dan untuk membuktikan saya manusia,',
    mathPlaceholder: 'hasil',
    refreshTooltip: 'Ganti soal hitungan',
    verified: 'terverifikasi manusia',
    incorrect: 'Jawaban salah, silakan coba lagi.',
    emptyWarning: 'Silakan isi hasil hitungan untuk membuktikan Anda manusia.',
    securityNote: 'Verifikasi bot otomatis',
  },
  en: {
    proveHumanPrefix: "and to prove i'm human,",
    mathPlaceholder: 'result',
    refreshTooltip: 'Refresh math problem',
    verified: 'verified human',
    incorrect: 'Incorrect answer, please try again.',
    emptyWarning: 'Please answer the math question to prove you are human.',
    securityNote: 'Automated bot protection',
  },
  de: {
    proveHumanPrefix: "und um zu beweisen, dass ich ein mensch bin,",
    mathPlaceholder: 'ergebnis',
    refreshTooltip: 'Aufgabe erneuern',
    verified: 'als Mensch verifiziert',
    incorrect: 'Falsche Antwort, bitte erneut versuchen.',
    emptyWarning: 'Bitte löse die Aufgabenstellung.',
    securityNote: 'Automatischer Bot-Schutz',
  },
  ja: {
    proveHumanPrefix: "人間であることを証明するため、",
    mathPlaceholder: '答え',
    refreshTooltip: '問題を再読み込み',
    verified: '人間として認証済み',
    incorrect: '答えが違います。再入力してください。',
    emptyWarning: '計算を完了してください。',
    securityNote: '自動ボット対策',
  },
};

function generateQuestion(): CaptchaQuestion {
  const ops: Array<'+' | '-' | '×'> = ['+', '-', '×'];
  const operator = ops[Math.floor(Math.random() * ops.length)];
  let num1 = 0;
  let num2 = 0;
  let answer = 0;

  if (operator === '+') {
    num1 = Math.floor(Math.random() * 20) + 3;
    num2 = Math.floor(Math.random() * 15) + 2;
    answer = num1 + num2;
  } else if (operator === '-') {
    num1 = Math.floor(Math.random() * 25) + 10;
    num2 = Math.floor(Math.random() * (num1 - 2)) + 1;
    answer = num1 - num2;
  } else {
    // Multiplication with small numbers
    num1 = Math.floor(Math.random() * 9) + 2;
    num2 = Math.floor(Math.random() * 6) + 2;
    answer = num1 * num2;
  }

  return { num1, num2, operator, answer };
}

export const AntiSpamCaptcha = forwardRef<CaptchaRef, AntiSpamCaptchaProps>(
  ({ lang, onValidationChange, className = '', variant = 'conversational' }, ref) => {
    const [question, setQuestion] = useState<CaptchaQuestion>(generateQuestion);
    const [userInput, setUserInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [honeypot, setHoneypot] = useState('');
    const mountTimeRef = useRef<number>(Date.now());
    const inputRef = useRef<HTMLInputElement>(null);

    const t = LOCALIZED_CAPTCHA_TEXT[lang] || LOCALIZED_CAPTCHA_TEXT.en;

    const refreshChallenge = () => {
      setIsRefreshing(true);
      const newQ = generateQuestion();
      setQuestion(newQ);
      setUserInput('');
      setStatus('idle');
      setErrorMessage('');
      if (onValidationChange) onValidationChange(false);
      setTimeout(() => setIsRefreshing(false), 300);
    };

    const handleInputChange = (val: string) => {
      setUserInput(val);
      setErrorMessage('');
      const trimmed = val.trim();
      if (trimmed === '') {
        setStatus('idle');
        if (onValidationChange) onValidationChange(false);
        return;
      }

      const numVal = parseInt(trimmed, 10);
      if (!isNaN(numVal) && numVal === question.answer) {
        setStatus('valid');
        if (onValidationChange) onValidationChange(true);
      } else {
        setStatus('idle');
        if (onValidationChange) onValidationChange(false);
      }
    };

    // Expose validation methods to parent form
    useImperativeHandle(ref, () => ({
      validate: () => {
        // Check honeypot: if filled, definitely a bot
        if (honeypot.trim() !== '') {
          return false;
        }

        // Check time spent on form: if less than 800ms, likely automated bot
        const elapsed = Date.now() - mountTimeRef.current;
        if (elapsed < 800) {
          setStatus('invalid');
          setErrorMessage('Submission too fast (Bot detected).');
          return false;
        }

        const trimmed = userInput.trim();
        if (trimmed === '') {
          setStatus('invalid');
          setErrorMessage(t.emptyWarning);
          inputRef.current?.focus();
          return false;
        }

        const numVal = parseInt(trimmed, 10);
        if (isNaN(numVal) || numVal !== question.answer) {
          setStatus('invalid');
          setErrorMessage(t.incorrect);
          inputRef.current?.focus();
          return false;
        }

        setStatus('valid');
        return true;
      },
      getHoneypotValue: () => honeypot,
      isBotSuspected: () => {
        const elapsed = Date.now() - mountTimeRef.current;
        return honeypot.trim() !== '' || elapsed < 800;
      },
      reset: () => {
        refreshChallenge();
        mountTimeRef.current = Date.now();
        setHoneypot('');
      },
    }));

    return (
      <div className={`space-y-1 ${className}`}>
        {/* Hidden Honeypot Field (Invisible to users, traps automated spam scripts) */}
        <div
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            left: '-9999px',
            top: '-9999px',
            height: 0,
            width: 0,
            overflow: 'hidden',
          }}
          aria-hidden="true"
        >
          <label htmlFor="website_url_hp">Leave this field empty</label>
          <input
            id="website_url_hp"
            type="text"
            name="website_url_hp"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {variant === 'conversational' ? (
          <div className="space-y-2">
            {/* Conversational Sentence Anti-Spam Check */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2 text-base sm:text-lg md:text-xl font-normal text-zinc-800 leading-relaxed lowercase">
              <span>{t.proveHumanPrefix}</span>
              <span className="font-mono-code text-zinc-800 bg-zinc-200/70 border border-zinc-300/80 px-2 py-0.5 rounded text-sm sm:text-base font-semibold select-none">
                {question.num1} {question.operator} {question.num2}
              </span>
              <button
                type="button"
                onClick={refreshChallenge}
                title={t.refreshTooltip}
                className="p-1 rounded text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer inline-flex items-center align-middle"
                aria-label="Refresh math challenge"
              >
                <RefreshCw
                  size={13}
                  className={`transition-transform duration-300 ${isRefreshing ? 'rotate-180 text-zinc-800' : ''}`}
                />
              </button>
              <span>=</span>
              <div className="relative inline-block">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={userInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={t.mathPlaceholder}
                  className={`w-20 bg-transparent border-b text-center font-normal transition-colors px-1 py-0.5 text-base sm:text-lg md:text-xl focus:outline-hidden lowercase ${
                    status === 'valid'
                      ? 'border-emerald-500 text-emerald-950 font-medium'
                      : status === 'invalid'
                      ? 'border-rose-400 text-rose-950 focus:border-rose-600'
                      : 'border-zinc-300 focus:border-zinc-800 text-zinc-900 placeholder:text-zinc-300'
                  }`}
                />
                {status === 'valid' && (
                  <span className="absolute -right-5 top-1/2 -translate-y-1/2 text-emerald-600">
                    <Check size={15} className="stroke-[2.5]" />
                  </span>
                )}
              </div>
              <span>.</span>
            </div>

            {/* Subtle Validation Feedback */}
            {status === 'valid' && (
              <div className="flex items-center gap-1.5 text-xs font-mono-code text-emerald-600 lowercase pt-0.5">
                <ShieldCheck size={13} />
                <span>{t.verified}</span>
              </div>
            )}

            {status === 'invalid' && errorMessage && (
              <div className="flex items-center gap-1.5 text-xs font-mono-code text-rose-600 animate-in fade-in lowercase pt-0.5">
                <ShieldAlert size={13} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        ) : (
          /* Classic Box Variant Fallback */
          <div
            className={`p-3 rounded-xl border transition-all duration-300 ${
              status === 'valid'
                ? 'bg-emerald-50/60 border-emerald-300'
                : status === 'invalid'
                ? 'bg-rose-50/60 border-rose-300'
                : 'bg-zinc-100/70 border-zinc-200/80 hover:border-zinc-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-200/90 shadow-2xs select-none">
                <span className="font-mono-code font-bold text-sm tracking-wider text-zinc-800">
                  {question.num1} {question.operator} {question.num2} = ?
                </span>
                <button
                  type="button"
                  onClick={refreshChallenge}
                  title={t.refreshTooltip}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-all cursor-pointer"
                  aria-label="Refresh Captcha"
                >
                  <RefreshCw
                    size={12}
                    className={`transition-transform duration-300 ${isRefreshing ? 'rotate-180 text-zinc-800' : ''}`}
                  />
                </button>
              </div>

              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={userInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={t.mathPlaceholder}
                  className={`w-full bg-white px-3 py-1.5 text-xs sm:text-sm font-mono-code rounded-lg border focus:outline-hidden transition-colors ${
                    status === 'valid'
                      ? 'border-emerald-500 text-emerald-950 pr-8'
                      : status === 'invalid'
                      ? 'border-rose-400 text-rose-950 focus:border-rose-600'
                      : 'border-zinc-300 focus:border-zinc-800 text-zinc-900 placeholder:text-zinc-400'
                  }`}
                />

                {status === 'valid' && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center text-emerald-600">
                    <Check size={14} className="stroke-[2.5]" />
                  </div>
                )}
              </div>
            </div>

            {status === 'valid' && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono-code text-emerald-700">
                <ShieldCheck size={12} />
                <span>{t.verified}</span>
              </div>
            )}

            {status === 'invalid' && errorMessage && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono-code text-rose-600 animate-in fade-in">
                <ShieldAlert size={12} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

AntiSpamCaptcha.displayName = 'AntiSpamCaptcha';
