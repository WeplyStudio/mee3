import React, { useState, useEffect, useRef } from 'react';
import { ScrollReveal } from './ScrollReveal';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/portfolioData';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { sendTelegramNotification } from '../utils/telegram';
import { AntiSpamCaptcha, CaptchaRef } from './AntiSpamCaptcha';
import { validateEmail, getFormStatusText } from '../utils/emailValidation';

interface ContactPageProps {
  lang: Language;
  onNavigateHome?: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ lang }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const captchaRef = useRef<CaptchaRef>(null);
  const formMountTimeRef = useRef<number>(Date.now());

  const hasName = formData.name.trim().length > 0;
  const hasMessage = formData.message.trim().length > 0;
  const hasEmail = formData.email.trim().length > 0;
  const emailValidation = validateEmail(formData.email, lang);
  const isEmailValid = emailValidation.isValid;

  const isFormValid = hasName && hasMessage && hasEmail && isEmailValid && isCaptchaValid;

  const localizedContent = {
    id: {
      tag: '[tulis untuk saya]',
      headline: 'saya membaca semua yang anda tulis.',
      subheadline: 'saya tidak bisa membalas semuanya secara langsung.',
      helloPrefix: 'halo jason, saya',
      namePlaceholder: 'nama anda',
      writeTopic: 'apa yang ingin saya tuliskan kepada anda',
      messagePlaceholder: 'apa pun yang ada di pikiran anda.',
      reachPrefix: 'anda dapat menghubungi saya di',
      emailPlaceholder: 'email anda',
      btnSend: 'kirim',
      btnSending: 'mengirim...',
      contactTag: '[kontak]',
      connectTag: '[terhubung]',
      email: 'hello@itsjason.my.id',
      socials: 'instagram, github',
      successTitle: 'pesan anda terkirim!',
      successDesc: 'terima kasih sudah menulis pesan. saya akan membacanya secepatnya.',
      sendAnother: 'tulis pesan lain',
    },
    en: {
      tag: '[write to me]',
      headline: 'i read everything you write.',
      subheadline: "i can't answer all of it right away.",
      helloPrefix: "hello jason, i'm",
      namePlaceholder: 'your name',
      writeTopic: 'what i wanted to write to you',
      messagePlaceholder: 'whatever is on your mind.',
      reachPrefix: 'you can reach me at',
      emailPlaceholder: 'your email',
      btnSend: 'send',
      btnSending: 'sending...',
      contactTag: '[contact]',
      connectTag: '[connect]',
      email: 'hello@itsjason.my.id',
      socials: 'instagram, github',
      successTitle: 'message sent!',
      successDesc: 'thank you for reaching out. i will read your message as soon as possible.',
      sendAnother: 'write another message',
    },
    de: {
      tag: '[schreib mir]',
      headline: 'ich lese alles, was du schreibst.',
      subheadline: 'ich kann nicht sofort auf alles antworten.',
      helloPrefix: 'hallo jason, ich bin',
      namePlaceholder: 'dein name',
      writeTopic: 'was ich dir schreiben wollte',
      messagePlaceholder: 'was auch immer dir auf dem herzen liegt.',
      reachPrefix: 'du erreichst mich unter',
      emailPlaceholder: 'deine e-mail',
      btnSend: 'senden',
      btnSending: 'wird gesendet...',
      contactTag: '[kontakt]',
      connectTag: '[verbinden]',
      email: 'hello@itsjason.my.id',
      socials: 'instagram, github',
      successTitle: 'nachricht gesendet!',
      successDesc: 'vielen dank für deine nachricht. ich werde sie baldmöglichst lesen.',
      sendAnother: 'weitere nachricht schreiben',
    },
    ja: {
      tag: '[メッセージを送信]',
      headline: 'いただいたメッセージはすべて拝読しています。',
      subheadline: 'すぐにご返信できない場合がございます。',
      helloPrefix: 'ジェイソンさん、こんにちは。私は',
      namePlaceholder: 'お名前',
      writeTopic: 'お伝えしたいこと',
      messagePlaceholder: 'ご自由にご記入ください。',
      reachPrefix: '連絡先メールアドレスは',
      emailPlaceholder: 'メールアドレス',
      btnSend: '送信',
      btnSending: '送信中...',
      contactTag: '[連絡先]',
      connectTag: '[ソーシャル]',
      email: 'hello@itsjason.my.id',
      socials: 'instagram, github',
      successTitle: '送信完了！',
      successDesc: 'メッセージを送信しました。確認次第、ご連絡いたします。',
      sendAnother: '別のメッセージを書く',
    },
  };

  const c = localizedContent[lang] || localizedContent.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate anti-spam captcha before proceeding
    if (captchaRef.current && !captchaRef.current.validate()) {
      return;
    }

    if (!formData.name.trim()) {
      setErrorMessage(lang === 'id' ? 'Nama wajib diisi.' : 'Name is required.');
      return;
    }

    const emailVal = validateEmail(formData.email, lang);
    if (!emailVal.isValid) {
      setErrorMessage(emailVal.errorReason || (lang === 'id' ? 'Email tidak valid.' : 'Invalid email address.'));
      return;
    }

    if (!formData.message.trim()) {
      setErrorMessage(lang === 'id' ? 'Pesan wajib diisi.' : 'Message is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendTelegramNotification({
        name: formData.name,
        email: formData.email,
        message: formData.message,
        subject: 'Contact Form Message',
        source: 'Conversational Contact Page (/contact)',
        honeypot: captchaRef.current?.getHoneypotValue() || '',
        formLoadTime: formMountTimeRef.current,
      });

      if (result.success) {
        setIsSuccess(true);
        setFormData({
          name: '',
          email: '',
          message: '',
        });
        captchaRef.current?.reset();
      } else {
        setErrorMessage(result.error || 'Gagal mengirim pesan. Silakan coba kembali.');
      }
    } catch {
      setErrorMessage('Terjadi masalah koneksi. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-800 pt-24 sm:pt-28 pb-12 px-6 sm:px-12 md:px-16 max-w-7xl mx-auto flex flex-col justify-between selection:bg-zinc-200">
      
      {/* Top Center Tag */}
      <div className="text-center pt-2 pb-12">
        <ScrollReveal delay={100} distance={10}>
          <span className="text-[12px] sm:text-xs text-zinc-400 font-mono-code lowercase tracking-wider">
            {c.tag}
          </span>
        </ScrollReveal>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start my-auto py-8">
        
        {/* Left Column Statement */}
        <div className="lg:col-span-4 space-y-2">
          <ScrollReveal delay={150} distance={15}>
            <h1 className="text-base sm:text-lg md:text-xl font-normal text-zinc-800 tracking-tight lowercase">
              {c.headline}
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={200} distance={15}>
            <p className="text-xs sm:text-sm text-zinc-400 font-normal lowercase leading-relaxed">
              {c.subheadline}
            </p>
          </ScrollReveal>
        </div>

        {/* Center Conversational Form Column */}
        <div className="lg:col-span-7 lg:col-start-6">
          {isSuccess ? (
            <ScrollReveal delay={100} distance={15}>
              <div className="p-8 rounded-2xl bg-zinc-100/80 border border-zinc-200/80 space-y-4 max-w-md">
                <div className="flex items-center gap-2.5 text-zinc-900 font-medium text-sm lowercase">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>{c.successTitle}</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed lowercase">
                  {c.successDesc}
                </p>
                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="text-xs font-mono-code text-zinc-900 underline hover:text-zinc-600 transition-colors cursor-pointer lowercase pt-2"
                >
                  {c.sendAnother}
                </button>
              </div>
            </ScrollReveal>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8 max-w-lg">
              <ScrollReveal delay={200} distance={15}>
                <div className="space-y-6 text-base sm:text-lg md:text-xl font-normal text-zinc-800 leading-relaxed lowercase">
                  
                  {/* Sentence 1: Hello jason, i'm [your name]. */}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
                    <span>{c.helloPrefix}</span>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={c.namePlaceholder}
                      className="bg-transparent border-b border-zinc-300 focus:border-zinc-800 text-zinc-900 placeholder:text-zinc-300 focus:outline-hidden px-1 py-0.5 text-base sm:text-lg md:text-xl font-normal transition-colors min-w-[160px] inline-block lowercase"
                    />
                    <span>.</span>
                  </div>

                  {/* Sentence 2: What i wanted to write to you */}
                  <div>
                    <span className="block text-zinc-800">{c.writeTopic}</span>
                  </div>

                  {/* Sentence 3: "whatever is on your mind." */}
                  <div className="relative pt-1 pb-2">
                    <span className="text-zinc-300 text-2xl font-serif select-none mr-1.5 align-top">“</span>
                    <textarea
                      rows={2}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder={c.messagePlaceholder}
                      className="w-[90%] sm:w-[92%] bg-transparent border-b border-zinc-300 focus:border-zinc-800 text-zinc-900 placeholder:text-zinc-300 focus:outline-hidden px-1 py-1 text-base sm:text-lg md:text-xl font-normal transition-colors resize-none leading-relaxed inline-block lowercase"
                    />
                    <span className="text-zinc-300 text-2xl font-serif select-none ml-1 align-bottom">”</span>
                  </div>

                  {/* Sentence 4: You can reach me at [your email]. */}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2 pt-2">
                    <span>{c.reachPrefix}</span>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={c.emailPlaceholder}
                      className="bg-transparent border-b border-zinc-300 focus:border-zinc-800 text-zinc-900 placeholder:text-zinc-300 focus:outline-hidden px-1 py-0.5 text-base sm:text-lg md:text-xl font-normal transition-colors min-w-[200px] inline-block lowercase"
                    />
                    <span>.</span>
                  </div>

                  {/* Sentence 5 (Anti-Spam Verification as conversational sentence): and to prove i'm human... */}
                  <div className="pt-2">
                    <AntiSpamCaptcha
                      ref={captchaRef}
                      lang={lang}
                      variant="conversational"
                      onValidationChange={(valid) => setIsCaptchaValid(valid)}
                    />
                  </div>

                </div>
              </ScrollReveal>

              {/* Submit Button & Plain Status Text */}
              <ScrollReveal delay={280} distance={15}>
                <div className="pt-2 flex flex-wrap items-center gap-3.5">
                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-mono-code transition-all duration-300 lowercase ${
                      isFormValid && !isSubmitting
                        ? 'bg-zinc-800 hover:bg-black text-white cursor-pointer active:scale-95 shadow-xs'
                        : 'bg-zinc-300 text-zinc-500 cursor-not-allowed select-none opacity-80'
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${isFormValid ? 'bg-emerald-400' : 'bg-zinc-400'}`}></span>
                    )}
                    <span>{isSubmitting ? c.btnSending : c.btnSend}</span>
                  </button>

                  {/* Plain unadorned text notice right beside the button */}
                  {!isFormValid && !isSubmitting && (
                    <span className="text-xs font-mono-code text-zinc-400 lowercase select-none">
                      {getFormStatusText(hasName, hasMessage, hasEmail, isEmailValid, isCaptchaValid, formData.email, lang)}
                    </span>
                  )}

                  {errorMessage && isFormValid && (
                    <span className="text-xs font-mono-code text-rose-500 lowercase">
                      {errorMessage}
                    </span>
                  )}
                </div>
              </ScrollReveal>

            </form>
          )}
        </div>

      </div>

      {/* Bottom Footer Section */}
      <ScrollReveal delay={300} distance={15}>
        <div className="pt-16 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono-code text-zinc-400">
          
          {/* Left: hello@itsjason.my.id */}
          <div className="flex items-center gap-3">
            <a
              href={`mailto:${c.email}`}
              className="text-zinc-800 hover:text-black transition-colors font-sans lowercase font-normal"
            >
              {c.email}
            </a>
          </div>

          {/* Right: instagram, github */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-zinc-800 font-sans font-normal">
              <a
                href="https://instagram.com/jasonn.doc"
                target="_blank"
                rel="noreferrer"
                className="hover:text-black transition-colors lowercase"
              >
                instagram
              </a>
              <span className="text-zinc-300">,</span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-black transition-colors lowercase"
              >
                github
              </a>
            </div>
          </div>

        </div>
      </ScrollReveal>

    </div>
  );
};
