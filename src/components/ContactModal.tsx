import React, { useState, useRef } from 'react';
import {
  AnimatedMail,
  AnimatedSend,
  AnimatedCopy,
  AnimatedClose,
  AnimatedArrowUpRight,
} from './AnimatedIcons';

import { Language } from '../types';
import { sendTelegramNotification } from '../utils/telegram';
import { AntiSpamCaptcha, CaptchaRef } from './AntiSpamCaptcha';
import { validateEmail, getFormStatusText } from '../utils/emailValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ContactModal: React.FC<Props> = ({ isOpen, onClose, lang }) => {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const captchaRef = useRef<CaptchaRef>(null);
  const formMountTimeRef = useRef<number>(Date.now());

  const hasName = name.trim().length > 0;
  const hasMessage = message.trim().length > 0;
  const hasEmail = email.trim().length > 0;
  const emailValidation = validateEmail(email, lang);
  const isEmailValid = emailValidation.isValid;

  const isFormValid = hasName && hasMessage && hasEmail && isEmailValid && isCaptchaValid;

  if (!isOpen) return null;

  const emailAddress = 'hello@itsjason.my.id';

  const handleCopy = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailVal = validateEmail(email, lang);
    if (!emailVal.isValid) {
      setErrorMessage(emailVal.errorReason || (lang === 'id' ? 'Email tidak valid.' : 'Invalid email address.'));
      return;
    }

    if (captchaRef.current && !captchaRef.current.validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendTelegramNotification({
        name,
        email,
        message,
        source: 'Quick Contact Modal',
        honeypot: captchaRef.current?.getHoneypotValue() || '',
        formLoadTime: formMountTimeRef.current,
      });

      if (result.success) {
        setSent(true);
        import('canvas-confetti')
          .then((module) => {
            const confetti = module.default;
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            });
          })
          .catch(() => {});
      } else {
        setErrorMessage(result.error || 'Gagal mengirim pesan. Silakan coba kembali.');
      }
    } catch {
      setErrorMessage('Terjadi masalah koneksi ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const texts: Record<Language, {
    copy: string;
    copied: string;
    title: string;
    subtitle: string;
    directEmail: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    sendMessage: string;
    successTitle: string;
    successDesc: string;
    doneBtn: string;
  }> = {
    id: {
      copy: 'Salin Email',
      copied: 'Disalin!',
      title: 'Hubungi Saya',
      subtitle: 'Kirim pesan untuk proyek baru, kolaborasi, atau sekadar menyapa.',
      directEmail: 'Email Langsung',
      nameLabel: 'NAMA',
      namePlaceholder: 'Steward Jason Liuwindra',
      emailLabel: 'EMAIL',
      emailPlaceholder: 'contoh@domain.com',
      messageLabel: 'PESAN',
      messagePlaceholder: 'Ceritakan tentang ide, proyek, atau visi Anda...',
      sendMessage: 'Kirim Pesan',
      successTitle: 'Pesan Berhasil Terkirim!',
      successDesc: 'Terima kasih atas pesan Anda. Saya akan segera menghubungi Anda kembali.',
      doneBtn: 'Selesai'
    },
    en: {
      copy: 'Copy Email',
      copied: 'Copied!',
      title: 'Get In Touch',
      subtitle: 'Drop a message for new projects, creative collaborations, or just to say hi.',
      directEmail: 'Direct Email',
      nameLabel: 'NAME',
      namePlaceholder: 'Steward Jason Liuwindra',
      emailLabel: 'EMAIL',
      emailPlaceholder: 'jane@example.com',
      messageLabel: 'MESSAGE',
      messagePlaceholder: 'Tell me about your project or vision...',
      sendMessage: 'Send Message',
      successTitle: 'Message Received!',
      successDesc: 'Thank you for reaching out. I will get back to you shortly.',
      doneBtn: 'Done'
    },
    de: {
      copy: 'E-Mail kopieren',
      copied: 'Kopiert!',
      title: 'Kontakt aufnehmen',
      subtitle: 'Senden Sie eine Nachricht für neue Projekte, Kooperationen oder einfach zum Kennenlernen.',
      directEmail: 'Direkte E-Mail',
      nameLabel: 'NAME',
      namePlaceholder: 'Steward Jason Liuwindra',
      emailLabel: 'E-MAIL',
      emailPlaceholder: 'beispiel@domain.de',
      messageLabel: 'NACHRICHT',
      messagePlaceholder: 'Erzählen Sie von Ihrem Projekt oder Ihrer Vision...',
      sendMessage: 'Nachricht senden',
      successTitle: 'Nachricht empfangen!',
      successDesc: 'Vielen Dank für Ihre Kontaktaufnahme. Ich melde mich in Kürze bei Ihnen.',
      doneBtn: 'Fertig'
    },
    ja: {
      copy: 'メールアドレスをコピー',
      copied: 'コピー完了！',
      title: 'お問い合わせ',
      subtitle: '新規プロジェクト、コラボレーション、またはカジュアルなご挨拶もお気軽にどうぞ。',
      directEmail: '直接メール',
      nameLabel: 'お名前',
      namePlaceholder: 'スチュワード・ジェイソン',
      emailLabel: 'メールアドレス',
      emailPlaceholder: 'sample@example.com',
      messageLabel: 'メッセージ',
      messagePlaceholder: 'プロジェクトの概要やご相談内容をお聞かせください...',
      sendMessage: 'メッセージを送信',
      successTitle: '送信完了いたしました！',
      successDesc: 'お問い合わせありがとうございます。内容を確認次第、速やかにご返信いたします。',
      doneBtn: '閉じる'
    }
  };

  const current = texts[lang] || texts.en;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white text-zinc-900 w-full max-w-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-zinc-200 relative overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <AnimatedClose size={15} />
        </button>

        <div className="space-y-1 mb-6">
          <div className="text-[11px] font-mono-code uppercase tracking-wider text-zinc-400">[contact]</div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">{current.title}</h3>
          <p className="text-xs sm:text-sm text-zinc-500">{current.subtitle}</p>
        </div>

        {/* Quick Email Copy Box */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-zinc-200/80 flex items-center justify-center shrink-0">
              <AnimatedMail size={16} className="text-zinc-700" />
            </div>
            <div className="truncate">
              <div className="text-[10px] text-zinc-400 uppercase font-mono-code tracking-wider">{current.directEmail}</div>
              <div className="text-xs sm:text-sm font-semibold text-zinc-800 truncate">{emailAddress}</div>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-medium border border-zinc-200 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <AnimatedCopy isCopied={copied} size={14} />
            <span>{copied ? current.copied : current.copy}</span>
          </button>
        </div>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h4 className="text-base font-bold text-emerald-950">
              {current.successTitle}
            </h4>
            <p className="text-xs text-emerald-700 max-w-sm mx-auto">
              {current.successDesc}
            </p>
            <button
              onClick={() => { setSent(false); onClose(); }}
              className="mt-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg cursor-pointer"
            >
              {current.doneBtn}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono-code text-zinc-500 uppercase mb-1">{current.nameLabel}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={current.namePlaceholder}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-900 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono-code text-zinc-500 uppercase mb-1">{current.emailLabel}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={current.emailPlaceholder}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono-code text-zinc-500 uppercase mb-1">{current.messageLabel}</label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={current.messagePlaceholder}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-900 transition-colors resize-none"
              ></textarea>
            </div>

            {/* Anti-Spam Captcha Challenge */}
            <AntiSpamCaptcha ref={captchaRef} lang={lang} onValidationChange={(valid) => setIsCaptchaValid(valid)} />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <a 
                  href="https://instagram.com/jasonn.doc" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-black flex items-center gap-1 group"
                >
                  Instagram <AnimatedArrowUpRight size={12} />
                </a>
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-black flex items-center gap-1 group"
                >
                  GitHub <AnimatedArrowUpRight size={12} />
                </a>
              </div>

              <div className="flex items-center gap-3">
                {!isFormValid && !isSubmitting && (
                  <span className="text-xs font-mono-code text-zinc-400 lowercase select-none">
                    {getFormStatusText(hasName, hasMessage, hasEmail, isEmailValid, isCaptchaValid, email, lang)}
                  </span>
                )}

                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-200 group ${
                    isFormValid && !isSubmitting
                      ? 'bg-black hover:bg-zinc-800 text-white cursor-pointer active:scale-95 shadow-md'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed select-none'
                  }`}
                >
                  <span>{isSubmitting ? 'Mengirim...' : current.sendMessage}</span>
                  <AnimatedSend size={13} />
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
