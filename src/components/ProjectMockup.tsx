import React, { useState } from 'react';
import { ShutterReveal } from './ShutterRevealImage';

interface Props {
  type: 'zylo' | 'trufin' | 'krigstudio' | string;
  className?: string;
  variant?: 'card' | 'screen' | 'compact';
  imageUrl?: string;
}

const PROJECT_IMAGE_MAP: Record<string, string> = {
  zylo: '/zylo.webp',
  trufin: '/trufin.webp',
  krigstudio: '/krig.png',
};

const PROJECT_SRCSET_MAP: Record<string, string> = {
  zylo: '/zylo-600.webp 600w, /zylo-900.webp 900w, /zylo.webp 1200w',
  trufin: '/trufin-600.webp 600w, /trufin-900.webp 900w, /trufin.webp 1200w',
  krigstudio: '/krig.png 600w, /krig.png 900w, /krig.png 1200w',
};

export const ProjectMockup: React.FC<Props> = ({ type, className = '', variant = 'card', imageUrl }) => {
  const [loaded, setLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const projectImg = imageUrl || PROJECT_IMAGE_MAP[type];
  const projectSrcSet = PROJECT_SRCSET_MAP[type];
  const sizes = variant === 'screen' ? '(max-width: 1024px) 100vw, 1200px' : '(max-width: 768px) 100vw, 400px';

  React.useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [projectImg]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      setIsVisible(true);
      return;
    }

    try {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      if (rect.top <= vh && rect.bottom >= 0) {
        setIsVisible(true);
        return;
      }
    } catch {}

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 450);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  if (projectImg) {
    return (
      <div 
        ref={containerRef}
        className={`w-full h-full relative overflow-hidden bg-[#090a0f] flex items-center justify-center ${className}`}
        style={{
          clipPath: isVisible ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
          WebkitClipPath: isVisible ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
          opacity: isVisible ? 1 : 0.85,
          transition: 'clip-path 1050ms cubic-bezier(0.16, 1, 0.3, 1), -webkit-clip-path 1050ms cubic-bezier(0.16, 1, 0.3, 1), opacity 800ms ease-out',
          willChange: 'clip-path, -webkit-clip-path',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {/* Skeleton pulse until loaded */}
        {!loaded && (
          <div className="absolute inset-0 bg-zinc-900/60 animate-pulse pointer-events-none z-10" />
        )}
        <img 
          ref={imgRef}
          src={projectImg} 
          srcSet={projectSrcSet}
          sizes={sizes}
          alt={`${type} preview`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{ transform: 'none' }}
          className="w-full h-full object-contain sm:object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] will-change-transform" 
        />
      </div>
    );
  }

  switch (type) {
    // -------------------------------------------------------------
    // 01: ZYLO (High-Performance Website Hosting & Cloud Platform)
    // -------------------------------------------------------------
    case 'zylo':
    case 'zylo-01':
    case 'canvas':
      return (
        <div className={`w-full h-full min-h-[280px] md:min-h-[360px] bg-gradient-to-br from-[#12131a] via-[#0d0e14] to-[#08090d] flex items-center justify-center p-5 relative overflow-hidden group-hover:scale-[1.01] transition-transform duration-700 ease-out ${className}`}>
          {/* Subtle neon glow & grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

          {/* Hosting Control Center Mockup */}
          <div className="relative z-10 w-full max-w-[350px] shadow-2xl rounded-xl transition-all duration-500 group-hover:-translate-y-1">
            <div className="bg-[#161722] p-2.5 rounded-xl border border-indigo-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[8px] font-mono-code text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                  <span className="font-bold text-zinc-200 uppercase tracking-wider">ZYLO // CLOUD HOSTING</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[7px] font-semibold">99.99% UPTIME</span>
                  <span>142ms TTFB</span>
                </div>
              </div>

              {/* Server Instance Overview */}
              <div className="relative bg-[#0b0c12] rounded-lg p-3 border border-zinc-800/80 space-y-2.5 overflow-hidden">
                {/* Top Quick Status */}
                <div className="grid grid-cols-3 gap-1.5 text-left">
                  <div className="bg-zinc-900/90 p-1.5 rounded border border-zinc-800">
                    <div className="text-[6px] text-zinc-500 font-mono-code uppercase">Active Hosts</div>
                    <div className="text-[10px] font-bold text-zinc-100">12 Instances</div>
                  </div>
                  <div className="bg-zinc-900/90 p-1.5 rounded border border-zinc-800">
                    <div className="text-[6px] text-zinc-500 font-mono-code uppercase">Edge CDN</div>
                    <div className="text-[10px] font-bold text-emerald-400">32 POPs Global</div>
                  </div>
                  <div className="bg-zinc-900/90 p-1.5 rounded border border-zinc-800">
                    <div className="text-[6px] text-zinc-500 font-mono-code uppercase">SSL Security</div>
                    <div className="text-[10px] font-bold text-indigo-400">TLS 1.3 Auto</div>
                  </div>
                </div>

                {/* Primary Deployed App Card */}
                <div className="bg-zinc-900/70 p-2 rounded border border-indigo-500/30 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span className="text-[9px] font-bold text-white font-mono-code">production-cluster-asia</span>
                    </div>
                    <div className="text-[7px] text-zinc-400 font-mono-code">domain: app.zylo.cloud &bull; Git auto-deploy</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-indigo-300 font-mono-code bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                      LIVE
                    </span>
                  </div>
                </div>

                {/* Live Bandwidth Sparkline */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[7px] font-mono-code text-zinc-400">
                    <span>Global Bandwidth &amp; Requests</span>
                    <span className="text-emerald-400 font-bold">14.8 GB/s &bull; 0ms dropped</span>
                  </div>
                  <div className="h-6 flex items-end gap-1 pt-0.5">
                    {[35, 55, 45, 75, 90, 65, 80, 70, 95, 85, 90, 100, 80, 85].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xs" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>

                {/* Bottom Status Feed */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[7px] font-mono-code text-zinc-400">
                  <span className="text-indigo-400">► all server nodes healthy</span>
                  <span>founder edition</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'zylo-02':
    case 'analytics':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#101118] p-4 flex flex-col justify-between rounded-xl border border-zinc-800 text-white font-mono-code ${className}`}>
          <div className="flex justify-between items-center text-[10px] text-zinc-400 border-b border-zinc-800 pb-2">
            <span className="font-bold text-indigo-400">SERVER TELEMETRY // CDN FLOW</span>
            <span>REAL-TIME</span>
          </div>
          <div className="grid grid-cols-3 gap-2 my-3">
            <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800">
              <div className="text-[8px] text-zinc-500">Cache Hit Ratio</div>
              <div className="text-sm font-bold text-emerald-400">99.4%</div>
            </div>
            <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800">
              <div className="text-[8px] text-zinc-500">Global TTFB</div>
              <div className="text-sm font-bold text-zinc-100">142 ms</div>
            </div>
            <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800">
              <div className="text-[8px] text-zinc-500">Active Requests</div>
              <div className="text-sm font-bold text-indigo-300">28.4k/s</div>
            </div>
          </div>
          <div className="h-10 flex items-end gap-1 pt-1">
            {[40, 65, 45, 80, 95, 60, 85, 70, 98, 88, 92, 100, 75, 85].map((h, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xs" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>
      );

    case 'zylo-03':
    case 'console':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#0c0c10] p-4 rounded-xl border border-indigo-500/20 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="text-[9px] text-zinc-400 border-b border-zinc-800 pb-1.5 flex justify-between">
            <span className="text-indigo-300">DNS ROUTING // DOMAIN MANAGER</span>
            <span className="text-emerald-400">PROPAGATED</span>
          </div>
          <div className="space-y-2 py-2 text-[9px]">
            <div className="flex justify-between items-center bg-zinc-900/60 p-1.5 rounded">
              <span className="text-zinc-400 font-bold">A @ 104.21.48.12</span>
              <span className="text-emerald-400">ACTIVE &bull; 0ms TTL</span>
            </div>
            <div className="flex justify-between items-center bg-zinc-900/60 p-1.5 rounded">
              <span className="text-zinc-400 font-bold">CNAME www cdn.zylo.io</span>
              <span className="text-emerald-400">ACTIVE &bull; PROXIED</span>
            </div>
            <div className="flex justify-between items-center bg-zinc-900/60 p-1.5 rounded">
              <span className="text-zinc-400">SSL Certificate</span>
              <span className="text-indigo-300">Wildcard TLS 1.3 Valid</span>
            </div>
          </div>
          <div className="bg-black/60 p-2 rounded text-[8px] text-zinc-400 border border-zinc-800">
            <code>&gt; DNS health check: all records globally verified</code>
          </div>
        </div>
      );

    case 'zylo-04':
    case 'darkmode':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#050508] p-4 rounded-xl border border-zinc-800 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-zinc-900 pb-1.5">
            <span className="font-bold text-zinc-300">EDGE SHIELD // DDOS MITIGATION</span>
            <span className="text-indigo-400">LAYER 7 ACTIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-2 text-[9px]">
            <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800">
              <div className="text-[7px] text-zinc-500">Threat Mitigation</div>
              <div className="text-xs font-bold text-emerald-400">100% Blocked</div>
            </div>
            <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800">
              <div className="text-[7px] text-zinc-500">Edge POP Latency</div>
              <div className="text-xs font-bold text-indigo-300">&lt; 12ms Region</div>
            </div>
          </div>
          <div className="text-[8px] text-zinc-500 flex justify-between items-center border-t border-zinc-900 pt-1.5">
            <span>● Singapore &bull; Tokyo &bull; Frankfurt &bull; US East</span>
            <span>Zero Packet Loss</span>
          </div>
        </div>
      );

    case 'zylo-05':
    case 'hub':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#0c0d12] p-4 rounded-xl border border-indigo-500/20 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-zinc-800 pb-1.5">
            <span className="text-indigo-400 font-bold">1-CLICK GIT DEPLOY // BUILD PIPELINE</span>
            <span className="text-emerald-400">SUCCESS</span>
          </div>
          <div className="space-y-1.5 my-2 text-[8px]">
            <div className="flex justify-between items-center bg-zinc-900/80 px-2 py-1 rounded">
              <span className="text-emerald-400 font-bold">commit 9f4a1c &bull; main</span>
              <span className="text-zinc-400">Deployed in 14.2s</span>
            </div>
            <div className="flex justify-between items-center bg-zinc-900/80 px-2 py-1 rounded">
              <span className="text-indigo-400 font-bold">SSL auto-provision</span>
              <span className="text-zinc-400">Active certificate</span>
            </div>
          </div>
          <div className="text-[8px] text-zinc-500">Automated rollbacks &bull; Zero downtime atomic switch</div>
        </div>
      );

    // -------------------------------------------------------------
    // 02: TRUFIN (Financial Institution & Pinjol Legality Verifier)
    // -------------------------------------------------------------
    case 'trufin':
    case 'trufin-01':
    case 'terminal':
      return (
        <div className={`w-full h-full min-h-[280px] md:min-h-[360px] bg-gradient-to-br from-[#0a1813] via-[#06120e] to-[#030806] flex items-center justify-center p-5 relative overflow-hidden group-hover:scale-[1.01] transition-transform duration-700 ease-out ${className}`}>
          {/* Subtle green ambient light */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Financial Verification Terminal */}
          <div className="relative z-10 w-full max-w-[350px] shadow-2xl rounded-xl transition-all duration-500 group-hover:-translate-y-1">
            <div className="bg-[#0e1f18] p-2.5 rounded-xl border border-emerald-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-950/80 text-[8px] font-mono-code text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded bg-emerald-500"></div>
                  <span className="font-bold text-zinc-200 uppercase tracking-wider">TRUFIN // FINANCE VERIFIER</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[7px] font-bold">
                  REGULATOR AUDITED ✓
                </span>
              </div>

              {/* Verification Search & Results Content */}
              <div className="bg-[#06120d] rounded-lg p-2.5 border border-emerald-900/40 space-y-2">
                {/* Search query bar preview */}
                <div className="bg-[#0b1d16] p-1.5 rounded border border-emerald-800/40 flex items-center justify-between text-[7px] font-mono-code text-zinc-300">
                  <span className="text-zinc-400">🔍 Cek: "PT Fintech Sejahtera / Pinjol XYZ"</span>
                  <span className="bg-emerald-500/30 text-emerald-300 px-1 py-0.5 rounded font-bold">VERIFIKASI</span>
                </div>

                {/* Institution Verification Cards */}
                <div className="space-y-1.5 text-[7px] font-mono-code">
                  {/* Verified Legal Entity */}
                  <div className="bg-[#0a231b] p-2 rounded border border-emerald-500/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 text-[8px]">PT FINTECH PINJAMAN RESMI</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black font-extrabold text-[6px]">
                        RESMI &amp; BERIZIN
                      </span>
                    </div>
                    <div className="text-[6px] text-zinc-400">
                      No. Izin: KEP-104/D.05/2023 &bull; Terdaftar &amp; Diawasi OJK
                    </div>
                  </div>

                  {/* Illegal / Suspicious Pinjol Warning */}
                  <div className="bg-[#2a1010]/80 p-2 rounded border border-red-500/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-400 text-[8px]">PINJOL DANA CEPAT (APK BODONG)</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-500 text-white font-extrabold text-[6px]">
                        ILEGAL / BAHAYA
                      </span>
                    </div>
                    <div className="text-[6px] text-zinc-400">
                      Status: Tidak Berizin &bull; Masuk Daftar Hitam Satgas Waspada
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="bg-[#091b15] p-1 rounded border border-emerald-900/30">
                    <div className="text-[5px] text-zinc-500 uppercase">Speed</div>
                    <div className="text-[8px] font-bold text-emerald-400">&lt; 0.2s</div>
                  </div>
                  <div className="bg-[#091b15] p-1 rounded border border-emerald-900/30">
                    <div className="text-[5px] text-zinc-500 uppercase">Database</div>
                    <div className="text-[8px] font-bold text-white">100% Valid</div>
                  </div>
                  <div className="bg-[#091b15] p-1 rounded border border-emerald-900/30">
                    <div className="text-[5px] text-zinc-500 uppercase">Flagged</div>
                    <div className="text-[8px] font-bold text-red-400">50k+ Scam</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'trufin-02':
    case 'chart':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#071310] p-4 rounded-xl border border-emerald-900/60 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-emerald-950 pb-1.5">
            <span className="text-emerald-400 font-bold">PINJOL RADAR // COMPLIANCE MATRIX</span>
            <span>PUBLIC REGISTRY</span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-2 text-[9px]">
            <div className="bg-[#0b1c16] p-2 rounded border border-emerald-900/40">
              <div className="text-[7px] text-zinc-400">Fintech Berizin</div>
              <div className="text-xs font-bold text-emerald-400">102 Entitas Resmi</div>
            </div>
            <div className="bg-[#0b1c16] p-2 rounded border border-emerald-900/40">
              <div className="text-[7px] text-zinc-400">Situs/APK Ilegal Terblokir</div>
              <div className="text-xs font-bold text-red-400">52,480 Terdaftar</div>
            </div>
          </div>
          <div className="bg-black/40 p-2 rounded text-[8px] text-emerald-300 flex justify-between items-center">
            <span>● Perlindungan Konsumen &bull; Data Keuangan Real-time</span>
            <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">VERIFIED</span>
          </div>
        </div>
      );

    case 'trufin-03':
    case 'multisig':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#091512] p-4 rounded-xl border border-emerald-800/40 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-emerald-950 pb-1.5">
            <span className="text-emerald-400 font-bold">LICENSE AUDIT // CERTIFICATE CHECK</span>
            <span className="text-zinc-400">OFFICIAL DATA</span>
          </div>
          <div className="space-y-1.5 my-2 text-[8px]">
            <div className="flex justify-between items-center bg-[#07110e] px-2 py-1.5 rounded border border-emerald-950">
              <span className="text-zinc-300">Nomor Registrasi Regulator</span>
              <span className="text-emerald-400 font-bold">VALID &amp; AKTIF ✓</span>
            </div>
            <div className="flex justify-between items-center bg-[#07110e] px-2 py-1.5 rounded border border-emerald-950">
              <span className="text-zinc-300">Domain Website Resmi</span>
              <span className="text-emerald-400 font-bold">MATCHED (.co.id)</span>
            </div>
            <div className="flex justify-between items-center bg-[#07110e] px-2 py-1.5 rounded border border-emerald-950">
              <span className="text-zinc-300">Bunga &amp; Biaya Transparan</span>
              <span className="text-emerald-400 font-bold">SESUAI ATURAN</span>
            </div>
          </div>
          <div className="text-[8px] text-emerald-400/80">Informasi terverifikasi langsung dari basis data resmi</div>
        </div>
      );

    case 'trufin-04':
    case 'mobile':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#040907] p-4 rounded-xl border border-emerald-900/50 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-emerald-950 pb-1.5">
            <span className="text-emerald-400 font-bold">MOBILE SCANNER // QUICK CHECK</span>
            <span className="text-zinc-500">PWA / ANDROID</span>
          </div>
          <div className="text-center py-2">
            <div className="text-[10px] text-zinc-400">Hasil Pengecekan Instansi</div>
            <div className="text-lg font-black text-emerald-400 tracking-tight">STATUS AMAN</div>
            <div className="text-[8px] text-emerald-300 mt-0.5">Entitas Terdaftar Resmi &bull; Skor Keamanan 98/100</div>
          </div>
          <div className="bg-emerald-950/40 p-1.5 rounded text-[8px] text-zinc-400 text-center border border-emerald-900/30">
            Scan QR Brosur / Masukkan Nama Instansi
          </div>
        </div>
      );

    case 'trufin-05':
    case 'risk':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#08120e] p-4 rounded-xl border border-emerald-800/30 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-emerald-950 pb-1.5">
            <span className="text-emerald-400 font-bold">FRAUD TELEMETRY // SCAM BLACKLIST</span>
            <span className="text-red-400 font-bold">LIVE ALERTS</span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-2 text-[8px]">
            <div className="bg-black/40 p-2 rounded">
              <div className="text-zinc-500">Laporan Penipuan Masuk</div>
              <div className="text-red-400 font-bold text-xs mt-0.5">320 Hari Ini</div>
            </div>
            <div className="bg-black/40 p-2 rounded">
              <div className="text-zinc-500">Akurasi Deteksi Penipuan</div>
              <div className="text-emerald-300 font-bold text-xs mt-0.5">99.8%</div>
            </div>
          </div>
          <div className="text-[8px] text-zinc-500">Laporan publik langsung diteruskan ke instansi penegak hukum</div>
        </div>
      );

    // -------------------------------------------------------------
    // 03: KRIGSTUDIO (Digital Invitation & Event Website Builder)
    // -------------------------------------------------------------
    case 'krigstudio':
    case 'krig-01':
    case 'hero3d':
      return (
        <div className={`w-full h-full min-h-[280px] md:min-h-[360px] bg-gradient-to-br from-[#1c1b18] via-[#11100e] to-[#090807] flex items-center justify-center p-5 relative overflow-hidden group-hover:scale-[1.01] transition-transform duration-700 ease-out ${className}`}>
          {/* Subtle warm luxury pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:20px_20px] opacity-10"></div>

          {/* Elegant Digital Invitation Card Frame */}
          <div className="relative z-10 w-full max-w-[340px] shadow-2xl rounded-xl transition-all duration-500 group-hover:-translate-y-1">
            <div className="bg-[#181714] p-3 rounded-xl border border-amber-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-950/60 text-[8px] font-mono-code text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="font-extrabold tracking-widest text-amber-200 uppercase text-[9px]">KRIG.STUDIO // DIGITAL INVITATION</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-amber-950/60 text-amber-300 rounded font-semibold text-[7px] border border-amber-800/40">
                    60 FPS MOTION
                  </span>
                </div>
              </div>

              {/* Digital Invitation Cover Display */}
              <div className="relative bg-[#0d0c0a] rounded-lg p-4 border border-amber-900/30 flex flex-col items-center justify-center text-center overflow-hidden">
                {/* Floating Wedding Monogram */}
                <div className="w-12 h-12 rounded-full border border-amber-400/40 flex items-center justify-center my-1">
                  <span className="font-serif italic text-amber-300 text-lg">M &amp; J</span>
                </div>

                <div className="text-[11px] font-serif italic text-zinc-200 mt-1 tracking-wider">
                  The Wedding of Maya &amp; Jason
                </div>
                <div className="text-[7px] text-amber-400/90 font-mono-code uppercase tracking-widest mt-0.5">
                  SAVE THE DATE &bull; 24.10.2026
                </div>

                {/* RSVP Interactive Button Mock */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="bg-amber-400 text-black px-3 py-1 rounded-full text-[8px] font-bold font-mono-code shadow-md">
                    💌 Buka Undangan
                  </div>
                  <div className="bg-zinc-800/80 text-zinc-300 px-2 py-1 rounded-full text-[7px] font-mono-code border border-zinc-700">
                    🎵 Play Music
                  </div>
                </div>
              </div>

              {/* Bottom marquee / Feature highlights */}
              <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[7px] font-mono-code text-zinc-400">
                <span className="uppercase tracking-wider text-amber-300/80">RSVP &bull; GIFT QR &bull; MAPS &bull; GALLERY</span>
                <span className="text-zinc-500">500+ EVENTS</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'krig-02':
    case 'reel':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#12110e] p-4 rounded-xl border border-amber-900/40 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-amber-950 pb-1.5">
            <span className="font-bold text-amber-300 uppercase">RSVP &amp; WISHES // GUESTBOOK FEED</span>
            <span className="text-emerald-400">95% ATTENDING</span>
          </div>
          <div className="space-y-1.5 my-2 text-[8px]">
            <div className="bg-[#181612] p-1.5 rounded border border-amber-900/30">
              <div className="flex justify-between text-amber-200 font-bold">
                <span>Sarah &amp; Family</span>
                <span className="text-emerald-400">Hadir (2 Orang)</span>
              </div>
              <p className="text-zinc-400 text-[7px] mt-0.5">"Selamat berbahagia Jason &amp; Maya! Semoga langgeng selalu!"</p>
            </div>
            <div className="bg-[#181612] p-1.5 rounded border border-amber-900/30">
              <div className="flex justify-between text-amber-200 font-bold">
                <span>Rian Aditya</span>
                <span className="text-emerald-400">Hadir (1 Orang)</span>
              </div>
              <p className="text-zinc-400 text-[7px] mt-0.5">"Congrats bro! Sampai jumpa di hari H!"</p>
            </div>
          </div>
          <div className="flex justify-between text-[8px] text-zinc-400 border-t border-amber-950 pt-1.5">
            <span>● Realtime WhatsApp Sync</span>
            <span>Total RSVP: 342 Guests</span>
          </div>
        </div>
      );

    case 'krig-03':
    case 'grid':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#0c0b09] p-4 rounded-xl border border-zinc-800 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-zinc-900 pb-1.5">
            <span className="font-bold text-zinc-200 uppercase">EDITORIAL THEMES // MINIMALIST</span>
            <span>COLLECTION</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 my-2">
            <div className="bg-zinc-900 aspect-square rounded p-1.5 border border-zinc-800 flex flex-col justify-between text-center">
              <span className="text-[7px] text-amber-300">01</span>
              <span className="text-[7px] font-bold">SERIF EDITORIAL</span>
            </div>
            <div className="bg-zinc-900 aspect-square rounded p-1.5 border border-zinc-800 flex flex-col justify-between text-center">
              <span className="text-[7px] text-amber-300">02</span>
              <span className="text-[7px] font-bold">BRUTALIST MODERN</span>
            </div>
            <div className="bg-zinc-900 aspect-square rounded p-1.5 border border-zinc-800 flex flex-col justify-between text-center">
              <span className="text-[7px] text-amber-300">03</span>
              <span className="text-[7px] font-bold">BOTANICAL LUXE</span>
            </div>
          </div>
          <div className="text-[8px] text-zinc-500 flex justify-between">
            <span>Responsive Mobile First</span>
            <span>Custom Typography</span>
          </div>
        </div>
      );

    case 'krig-04':
    case 'sound':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#100f0c] p-4 rounded-xl border border-amber-900/30 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-zinc-800 pb-1.5">
            <span className="font-bold text-amber-200 uppercase">AUDIO &amp; VENUE NAVIGATION</span>
            <span className="text-amber-400">AUTOPLAY</span>
          </div>
          <div className="text-center py-2 space-y-2">
            <div className="flex justify-center items-center gap-1 h-7">
              {[40, 70, 90, 60, 30, 80, 100, 75, 45, 85, 50, 65, 30].map((v, i) => (
                <div key={i} className="w-1 bg-amber-400/80 rounded-full" style={{ height: `${v}%` }}></div>
              ))}
            </div>
            <div className="text-[8px] text-zinc-300">Now Playing: "Can't Help Falling in Love (Acoustic)"</div>
            <div className="inline-block bg-amber-950/60 px-2 py-0.5 rounded text-[7px] text-amber-300 border border-amber-800/40">
              📍 Buka Rute Google Maps (Grand Ballroom)
            </div>
          </div>
          <div className="text-[8px] text-zinc-500 border-t border-zinc-900 pt-1 flex justify-between">
            <span>Web Audio API</span>
            <span>Seamless Loop</span>
          </div>
        </div>
      );

    case 'krig-05':
    case 'archive':
      return (
        <div className={`w-full h-full min-h-[220px] bg-[#0d0c09] p-4 rounded-xl border border-amber-900/30 text-white font-mono-code flex flex-col justify-between ${className}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 border-b border-zinc-900 pb-1.5">
            <span className="font-bold text-amber-200 uppercase">DIGITAL ENVELOPE // QRIS &amp; GIFTS</span>
            <span className="text-emerald-400">INSTANT</span>
          </div>
          <div className="space-y-1.5 my-2 text-[8px]">
            <div className="flex justify-between items-center bg-zinc-900/90 p-1.5 rounded border border-amber-950">
              <span className="text-zinc-200">BCA: 5410982341 (Jason L.)</span>
              <span className="text-amber-400 font-bold">[SALIN REKENING]</span>
            </div>
            <div className="flex justify-between items-center bg-zinc-900/90 p-1.5 rounded border border-amber-950">
              <span className="text-zinc-200">QRIS Digital Payment Transfer</span>
              <span className="text-emerald-400 font-bold">[SCAN QR]</span>
            </div>
          </div>
          <div className="text-[8px] text-zinc-500">Integrasi amplop digital tanpa potongan biaya</div>
        </div>
      );

    default:
      return (
        <div className={`w-full h-full min-h-[220px] bg-zinc-900 p-5 rounded-xl border border-zinc-800 text-white flex flex-col justify-center items-center text-center font-mono-code ${className}`}>
          <div className="text-xs font-bold text-zinc-200">{type}</div>
          <div className="text-[9px] text-zinc-500 mt-1">interactive project screen preview</div>
        </div>
      );
  }
};
