import { Project, PhilosophyItem, ServiceItem, StatItem, FAQItem, Language } from '../types';

export const PROJECTS_BY_LANG: Record<Language, Project[]> = {
  id: [
    {
      id: 'zylo',
      title: 'zylo | platform cloud & website hosting berkinerja tinggi',
      client: 'zylo hosting (founder)',
      company: 'zylo inc.',
      category: 'Infrastruktur Cloud & Web Hosting',
      year: '2025',
      description: 'Platform web hosting dan deployment cloud generasi terbaru dengan uptime 99.99%, edge caching global, propagasi DNS instan, dan dashboard pengembang ultra-intuitif.',
      summary: 'mendirikan, merekayasa, dan merancang arsitektur web hosting full-stack serta konsol manajemen pelanggan untuk zylo. dilengkapi telemetri server kustom, provisi ssl otomatis, dan deployment git 1-klik yang mulus.',
      role: 'founder & lead architect',
      type: 'cloud web hosting & infrastruktur server',
      tech: 'react, next.js, typescript, tailwind css, node.js, docker, edge cdn, figma',
      deliverables: ['Konsol Cloud Hosting', 'Mesin Deployment Git 1-Klik', 'Pengelola Domain & DNS', 'Telemetri Kesehatan Server & CDN'],
      problem: 'penyedia web hosting tradisional dipenuhi cPanel yang membingungkan, biaya perpanjangan tersembunyi, provisi server lambat, dan pengelolaan domain terpecah-pecah yang membuat kreator dan bisnis frustrasi.',
      decisions: 'saya merancang pusat kendali hosting yang ramping dan taktil dengan pengukur sumber daya real-time (CPU/RAM/Bandwidth), alur deployment nir-henti otomatis, dan perutean edge multi-kawasan global.',
      impact: 'zylo berhasil meng-hosting dan memberdayakan lebih dari 10.000 situs web aktif di seluruh dunia dengan rekam jejak uptime 99.99% dan waktu respons TTFB global di bawah 180ms.',
      achievements: [
        {
          number: '99.99%',
          title: 'keandalan uptime server',
          description: 'menjaga ketersediaan tinggi dengan failover multi-wilayah terdistribusi dan mitigasi DDoS otomatis.'
        },
        {
          number: '< 180ms',
          title: 'waktu respons ttfb global',
          description: 'optimalisasi distribusi aset statis dan caching edge di seluruh datacenter global untuk pemuatan secepat kilat.'
        },
        {
          number: '10k+',
          title: 'situs web aktif di-hosting',
          description: 'menskalakan platform dari prototipe awal hingga dipercaya oleh ribuan developer, agensi, dan bisnis online.'
        }
      ],
      screens: [
        { id: 'zylo-01', title: 'Cari & Cek Nama Domain', caption: 'Temukan nama domain sempurna Anda dengan saran cerdas instan', type: 'domain', imageUrl: '/zylo1.png' },
        { id: 'zylo-02', title: 'Paket Hosting Fleksibel', caption: 'Paket bulanan dan tahunan hemat dengan jaminan uang kembali 30 hari', type: 'pricing', imageUrl: '/zylo2.png' },
        { id: 'zylo-03', title: 'Pusat Konversi & Peluncuran', caption: 'Bikin online makin keren dengan setup instan dan navigasi terpadu', type: 'cta', imageUrl: '/zylo3.png' },
        { id: 'zylo-04', title: 'Dasbor Infrastruktur Cloud', caption: 'Status kluster server live, pemantau kapasitas, dan throughput', type: 'console', imageUrl: '/zylo.png' },
        { id: 'zylo-05', title: 'Perisai Jaringan Edge Global', caption: 'Distribusi aset POP global dengan latensi respons sub-180ms', type: 'network', imageUrl: '/zylo.webp' }
      ],
      screenImages: ['/zylo1.png', '/zylo2.png', '/zylo3.png', '/zylo.png', '/zylo.webp'],
      metrics: [
        { label: 'SLA Uptime', value: '99.99%' },
        { label: 'TTFB Global', value: '< 180ms' },
        { label: 'Situs Aktif', value: '10,000+' }
      ],
      imageType: 'zylo',
      imageUrl: '/zylo.webp',
      liveUrl: 'https://zylo.ai',
      accentColor: '#6366f1',
      nextProjectId: 'trufin',
      nextProjectTitle: 'trufin | platform verifikasi instansi keuangan & pinjol'
    },
    {
      id: 'trufin',
      title: 'trufin | platform verifikasi instansi keuangan & pinjol',
      client: 'trufin verification',
      company: 'trufin verification',
      category: 'Keamanan Fintech & Verifikasi Institusi',
      year: '2025',
      description: 'Platform intelijen publik komprehensif untuk memverifikasi keaslian, legalitas izin resmi, dan status risiko institusi keuangan, pinjol (fintech lending), serta entitas investasi.',
      summary: 'merancang dan mengembangkan portal verifikasi keuangan resmi dan mesin pendeteksi penipuan. memberdayakan masyarakat dan institusi untuk memverifikasi aplikasi pinjaman legal vs ilegal secara instan.',
      role: 'lead product designer & frontend engineer',
      type: 'platform web keamanan fintech & verifikasi',
      tech: 'react, typescript, tailwind css, rest api, search indexer, figma',
      deliverables: ['Mesin Verifikasi Institusi', 'Pengecek Pinjol & Fintech', 'Radar Lisensi Resmi', 'Pusat Pelaporan Penipuan Komunitas'],
      problem: 'maraknya aplikasi pinjol ilegal dan penipuan keuangan predator yang memalsukan izin resmi regulator serta merugikan masyarakat tanpa adanya alat verifikasi publik yang cepat dan berwenang.',
      decisions: 'saya merancang pencarian instan yang mencocokkan basis data regulator, indikator visual keamanan kontras tinggi (Legal Terverifikasi vs Berbahaya/Ilegal), dan panduan kepatuhan hukum yang jelas.',
      impact: 'trufin telah mengindeks dan memverifikasi silang ribuan entitas keuangan, menandai lebih dari 50.000 tautan/aplikasi penipuan, dan memberikan kepastian keamanan finansial kepada ratusan ribu pengguna.',
      achievements: [
        {
          number: '100%',
          title: 'registri regulator terverifikasi',
          description: 'terhubung dengan registri keuangan berwenang dan audit database untuk konfirmasi legalitas instan.'
        },
        {
          number: '< 0.2s',
          title: 'pencarian verifikasi instan',
          description: 'mesin pencari fuzzy ultra-cepat yang memeriksa nomor izin, nama aplikasi, dan identitas perusahaan.'
        },
        {
          number: '50k+',
          title: 'entitas penipuan & ilegal ditandai',
          description: 'melindungi masyarakat dengan mengkatalogkan klon pinjol tanpa izin, situs phishing, dan pialang ilegal.'
        }
      ],
      screens: [
        { id: 'trufin-01', title: 'Pusat Verifikasi Institusi', caption: 'Pencarian instan nama/izin, lencana resmi regulator, dan indikator tingkat risiko', type: 'terminal' },
        { id: 'trufin-02', title: 'Radar Fintech & Pinjol', caption: 'Perbandingan langsung fintech berizin resmi vs entitas berisiko tinggi tanpa izin', type: 'chart' },
        { id: 'trufin-03', title: 'Inspektur Keaslian Lisensi', caption: 'Audit sertifikat izin terperinci, alamat perusahaan valid, dan status badan pengawas', type: 'multisig' },
        { id: 'trufin-04', title: 'Pemeriksa Cepat Seluler', caption: 'Pengecek web seluler ringan dengan validasi instan kode QR & paket APK', type: 'mobile' },
        { id: 'trufin-05', title: 'Telemetri & Daftar Hitam Penipuan', caption: 'Peringatan penipuan berbasis komunitas, umpan blacklist, dan deteksi pola mencurigakan', type: 'risk' }
      ],
      metrics: [
        { label: 'Akurasi Database', value: '100%' },
        { label: 'Kecepatan Pencarian', value: '< 0.2s' },
        { label: 'Entitas Ditandai', value: '50k+' }
      ],
      imageType: 'trufin',
      imageUrl: '/trufin.webp',
      liveUrl: 'https://trufin.io',
      accentColor: '#10b981',
      nextProjectId: 'krigstudio',
      nextProjectTitle: 'krigstudio | pembuat undangan digital & website acara'
    },
    {
      id: 'krigstudio',
      title: 'krigstudio | pembuat undangan digital & website acara',
      client: 'krigstudio',
      company: 'krigstudio',
      category: 'Pembuat Web Acara & Undangan Digital',
      year: '2024',
      description: 'Platform pembuatan undangan digital interaktif dan elegan yang memungkinkan pasangan dan perencana acara membuat website pernikahan kustom dengan RSVP mulus, amplop digital, dan musik terkurasi.',
      summary: 'menciptakan platform undangan digital menyeluruh dan sistem desain editorial. menampilkan tata letak dinamis, buku tamu RSVP real-time, transfer amplop digital, dan audio latar berkesan mendalam.',
      role: 'creator & lead frontend developer',
      type: 'pembuat undangan digital & platform event',
      tech: 'react, next.js, typescript, tailwind css, framer motion, web audio api, figma',
      deliverables: ['Penyusun Undangan Digital', 'Pusat RSVP & Ucapan Interaktif', 'Amplop Digital & Transfer QR', 'Galeri Foto & Musik Spasial'],
      problem: 'undangan kertas tradisional mahal, statis, dan sulit dikelola, sementara template undangan digital biasa terasa generik, dipenuhi iklan, dan kurang berkesan untuk momen istimewa hidup.',
      decisions: 'saya menciptakan estetika editorial dengan interaksi gulir 60fps mulus, personalisasi nama tamu dinamis, hitung mundur langsung, dan sinkronisasi konfirmasi RSVP ke WhatsApp serta spreadsheet.',
      impact: 'krigstudio telah melayani undangan untuk lebih dari 500 pernikahan dan perayaan, mempertahankan tingkat konfirmasi RSVP 95% dan dipuji karena estetika minimalisnya yang berkelas.',
      achievements: [
        {
          number: '95%',
          title: 'tingkat konfirmasi rsvp',
          description: 'alur konfirmasi digital yang memudahkan tamu merespons dan mengirimkan doa ucapan dalam hitungan detik.'
        },
        {
          number: '60fps',
          title: 'animasi & audio yang mulus',
          description: 'melodi latar berkesan dan transisi album foto cair yang dioptimalkan untuk layar ponsel pintar.'
        },
        {
          number: '500+',
          title: 'acara & pernikahan didukung',
          description: 'dipercaya oleh pasangan dan penyelenggara acara untuk memberikan kesan pertama yang abadi dan indah.'
        }
      ],
      screens: [
        { id: 'krig-01', title: 'Kanvas Undangan Interaktif', caption: 'Pembuka sampul khusus, linimasa cerita pasangan animasi, dan hitung mundur acara langsung', type: 'hero3d' },
        { id: 'krig-02', title: 'Umpan RSVP & Ucapan Dinamis', caption: 'Konfirmasi kehadiran instan, buku tamu doa ucapan, dan penghitungan jumlah tamu', type: 'reel' },
        { id: 'krig-03', title: 'Palet Tema Editorial', caption: 'Tata letak tipografi minimalis, palet warna mewah, dan penggeser galeri foto', type: 'grid' },
        { id: 'krig-04', title: 'Audio & Navigasi Spasial', caption: 'Pemutar musik latar terkurasi dipadukan dengan panduan rute langsung Google Maps', type: 'sound' },
        { id: 'krig-05', title: 'Amplop & Hadiah Digital', caption: 'Integrasi transfer bank & dompet digital, pembuat QR pembayaran, dan daftar kado', type: 'archive' }
      ],
      metrics: [
        { label: 'Tingkat RSVP', value: '95%' },
        { label: 'Frame Rate', value: '60 FPS' },
        { label: 'Acara Terlaksana', value: '500+' }
      ],
      imageType: 'krigstudio',
      imageUrl: '/krigstudio.webp',
      liveUrl: 'https://krigstudio.com',
      accentColor: '#09090b',
      nextProjectId: 'zylo',
      nextProjectTitle: 'zylo | platform cloud & website hosting berkinerja tinggi'
    }
  ],
  en: [
    {
      id: 'zylo',
      title: 'zylo | high-performance website hosting & cloud platform',
      client: 'zylo hosting (founder)',
      company: 'zylo inc.',
      category: 'Web Hosting & Cloud Infrastructure',
      year: '2025',
      description: 'A next-generation web hosting and cloud deployment platform delivering 99.99% uptime, global edge caching, instant DNS propagation, and an ultra-intuitive developer dashboard.',
      summary: 'founded, engineered, and designed the full-stack web hosting architecture and customer management console for zylo. built with custom server telemetry, automated ssl provisioning, and seamless 1-click git deployments.',
      role: 'founder & lead architect',
      type: 'cloud web hosting & server infrastructure',
      tech: 'react, next.js, typescript, tailwind css, node.js, docker, edge cdn, figma',
      deliverables: ['Cloud Hosting Console', '1-Click Git Deployment Engine', 'DNS & Domain Manager', 'Server Health & CDN Telemetry'],
      problem: 'traditional web hosting providers are cluttered with confusing cPanels, hidden renewal fees, slow server provisioning, and fragmented domain management that frustrate creators and businesses alike.',
      decisions: 'i architected a streamlined, tactile hosting control center with real-time resource gauges (CPU/RAM/Bandwidth), automated zero-downtime deployment pipelines, and global multi-region edge routing.',
      impact: 'zylo successfully hosts and powers over 10,000 active websites globally with a 99.99% uptime track record and sub-180ms global Time-To-First-Byte (TTFB) response rates.',
      achievements: [
        {
          number: '99.99%',
          title: 'server uptime reliability',
          description: 'maintained rock-solid high availability with distributed multi-region failover and automated DDoS mitigation.'
        },
        {
          number: '< 180ms',
          title: 'global ttfb response time',
          description: 'optimized static asset distribution and edge caching across global POP datacenters for instantaneous web loading.'
        },
        {
          number: '10k+',
          title: 'active websites hosted',
          description: 'scaled the platform from initial prototype to empowering thousands of developers, agencies, and online businesses.'
        }
      ],
      screens: [
        { id: 'zylo-01', title: 'Domain Search & Availability', caption: 'Find and check domain availability with real-time smart suggestions', type: 'domain', imageUrl: '/zylo1.png' },
        { id: 'zylo-02', title: 'Hosting Plans & Pricing Matrix', caption: 'Flexible monthly & annual plans with SSD storage & bandwidth gauges', type: 'pricing', imageUrl: '/zylo2.png' },
        { id: 'zylo-03', title: 'Conversion & Launch Center', caption: 'Seamless onboarding CTA, customer quick links, and platform SLA', type: 'cta', imageUrl: '/zylo3.png' },
        { id: 'zylo-04', title: 'High-Performance Cloud Console', caption: 'Live server cluster instances, CPU telemetry, and throughput', type: 'console', imageUrl: '/zylo.png' },
        { id: 'zylo-05', title: 'Global Edge Shield & Routing', caption: 'Global POP datacenter routing with sub-180ms TTFB response', type: 'network', imageUrl: '/zylo.webp' }
      ],
      screenImages: ['/zylo1.png', '/zylo2.png', '/zylo3.png', '/zylo.png', '/zylo.webp'],
      metrics: [
        { label: 'Uptime SLA', value: '99.99%' },
        { label: 'Global TTFB', value: '< 180ms' },
        { label: 'Active Sites', value: '10,000+' }
      ],
      imageType: 'zylo',
      imageUrl: '/zylo.webp',
      liveUrl: 'https://zylo.ai',
      accentColor: '#6366f1',
      nextProjectId: 'trufin',
      nextProjectTitle: 'trufin | financial institution & pinjol verification platform'
    },
    {
      id: 'trufin',
      title: 'trufin | financial institution & pinjol verification platform',
      client: 'trufin verification',
      company: 'trufin verification',
      category: 'Fintech Security & Institution Verification',
      year: '2025',
      description: 'A comprehensive public intelligence platform to verify the authenticity, official regulatory licensing, and risk status of financial institutions, fintech lenders (pinjol), and investment entities.',
      summary: 'designed and developed the official financial verification portal and fraud detection engine. empowers everyday consumers and institutions to instantly verify legal vs illegal loan apps and suspicious financial entities.',
      role: 'lead product designer & frontend engineer',
      type: 'fintech security & verification web platform',
      tech: 'react, typescript, tailwind css, rest api, search indexer, figma',
      deliverables: ['Institution Verification Engine', 'Pinjol & Fintech Checker', 'Official License Radar', 'Community Fraud Reporting Hub'],
      problem: 'the surge of illegal lending apps (pinjol ilegal) and predatory financial scams that forge official licenses and mislead consumers without a fast, authoritative, and easy-to-use public verification tool.',
      decisions: 'i designed an instant search lookup matching regulatory registries, high-contrast visual safety indicators (Verified Legal vs Dangerous/Illegal), and clear guidance on legal compliance standards.',
      impact: 'trufin indexed and cross-verified thousands of financial entities, flagged over 50,000 fraudulent links/apps, and provided hundreds of thousands of users with immediate financial safety clarity.',
      achievements: [
        {
          number: '100%',
          title: 'verified regulatory registry',
          description: 'connected authoritative financial registries and database audits for instantaneous legality confirmation.'
        },
        {
          number: '< 0.2s',
          title: 'instant verification lookup',
          description: 'engineered an ultra-fast fuzzy search engine querying license numbers, app names, and corporate identities.'
        },
        {
          number: '50k+',
          title: 'scam & illegal entities flagged',
          description: 'protected users by cataloging unverified pinjol clones, phishing websites, and unauthorized brokerages.'
        }
      ],
      screens: [
        { id: 'trufin-01', title: 'Institution Verification Hub', caption: 'Instant name/license search, official regulatory badge, and risk tier indicator', type: 'terminal' },
        { id: 'trufin-02', title: 'Fintech & Pinjol Radar', caption: 'Direct comparison of licensed fintech versus unauthorized high-risk entities', type: 'chart' },
        { id: 'trufin-03', title: 'License Authenticity Inspector', caption: 'Detailed license certificate audit, valid company address, and regulator status', type: 'multisig' },
        { id: 'trufin-04', title: 'Mobile Quick Checker', caption: 'Lightweight mobile web checker with instant QR & APK package validation', type: 'mobile' },
        { id: 'trufin-05', title: 'Fraud Telemetry & Blacklist', caption: 'Community-driven scam warnings, blacklist feeds, and suspicious pattern alerts', type: 'risk' }
      ],
      metrics: [
        { label: 'Database Accuracy', value: '100%' },
        { label: 'Search Speed', value: '< 0.2s' },
        { label: 'Flagged Entities', value: '50k+' }
      ],
      imageType: 'trufin',
      imageUrl: '/trufin.webp',
      liveUrl: 'https://trufin.io',
      accentColor: '#10b981',
      nextProjectId: 'krigstudio',
      nextProjectTitle: 'krigstudio | digital invitation creator & event website builder'
    },
    {
      id: 'krigstudio',
      title: 'krigstudio | digital invitation creator & event website builder',
      client: 'krigstudio',
      company: 'krigstudio',
      category: 'Digital Invitation & Event Web Builder',
      year: '2024',
      description: 'An elegant, interactive digital invitation creator allowing couples and event planners to build bespoke wedding and celebration websites with seamless RSVP, digital gifts, and curated music.',
      summary: 'crafted the complete end-to-end digital invitation platform and design system. featuring customizable editorial layouts, real-time RSVP guestbook tracking, digital envelope transfers, and sensory background audio.',
      role: 'creator & lead frontend developer',
      type: 'digital invitation creator & event platform',
      tech: 'react, next.js, typescript, tailwind css, framer motion, web audio api, figma',
      deliverables: ['Digital Invitation Builder', 'Interactive RSVP & Wishes Hub', 'Digital Envelope & QR Transfer', 'Spatial Photo & Music Gallery'],
      problem: 'traditional paper invitations are costly, static, and difficult to manage, while standard digital invitation templates often feel generic, cluttered with ads, and uninspiring for special life moments.',
      decisions: 'i created an editorial, bespoke aesthetic with buttery 60fps scroll interactions, dynamic guest name personalization, live countdown timers, and integrated RSVP sync to WhatsApp and spreadsheet dashboards.',
      impact: 'krigstudio has delivered invitations for over 500 weddings and celebrations, maintaining a 95% RSVP confirmation rate and praised for its minimalist, memorable aesthetic.',
      achievements: [
        {
          number: '95%',
          title: 'rsvp response completion',
          description: 'streamlined digital confirmation flows enabling guests to respond and send personalized prayers in seconds.'
        },
        {
          number: '60fps',
          title: 'smooth animations & audio',
          description: 'engineered sensory background melodies and fluid photo book transitions optimized for mobile screens.'
        },
        {
          number: '500+',
          title: 'events & weddings powered',
          description: 'trusted by couples and event organizers to create lasting, beautiful first impressions for their guests.'
        }
      ],
      screens: [
        { id: 'krig-01', title: 'Interactive Invitation Canvas', caption: 'Custom cover reveal, animated couple story timeline, and live event countdown', type: 'hero3d' },
        { id: 'krig-02', title: 'Dynamic RSVP & Wishes Feed', caption: 'Instant attendance confirmation, guest wishes guestbook, and headcount tally', type: 'reel' },
        { id: 'krig-03', title: 'Editorial Theme Palette', caption: 'Minimalist typography layouts, luxury color palettes, and gallery sliders', type: 'grid' },
        { id: 'krig-04', title: 'Sensory Audio & Navigation', caption: 'Curated background music player paired with direct Google Maps route guidance', type: 'sound' },
        { id: 'krig-05', title: 'Digital Envelope & Gifts', caption: 'Bank transfer & e-wallet integration, QR payment generator, and gift registry', type: 'archive' }
      ],
      metrics: [
        { label: 'RSVP Rate', value: '95%' },
        { label: 'Frame Rate', value: '60 FPS' },
        { label: 'Events Hosted', value: '500+' }
      ],
      imageType: 'krigstudio',
      imageUrl: '/krigstudio.webp',
      liveUrl: 'https://krigstudio.com',
      accentColor: '#09090b',
      nextProjectId: 'zylo',
      nextProjectTitle: 'zylo | high-performance website hosting & cloud platform'
    }
  ],
  de: [
    {
      id: 'zylo',
      title: 'zylo | hochperformantes web-hosting & cloud-plattform',
      client: 'zylo hosting (gründer)',
      company: 'zylo inc.',
      category: 'Web-Hosting & Cloud-Infrastruktur',
      year: '2025',
      description: 'Eine Web-Hosting- und Cloud-Deployment-Plattform der nächsten Generation mit 99,99% Uptime, globalem Edge-Caching, sofortiger DNS-Verbreitung und einem intuitiven Entwickler-Dashboard.',
      summary: 'Gründung, Konzeption und Entwicklung der Full-Stack-Architektur und Kundenmanagement-Konsole für zylo. Mit Server-Telemetrie, automatisierter SSL-Bereitstellung und 1-Klick-Git-Deployments.',
      role: 'founder & lead architect',
      type: 'cloud web-hosting & server-infrastruktur',
      tech: 'react, next.js, typescript, tailwind css, node.js, docker, edge cdn, figma',
      deliverables: ['Cloud-Hosting-Konsole', '1-Klick Git-Deployment-Engine', 'DNS- & Domain-Manager', 'Server-Health- & CDN-Telemetrie'],
      problem: 'Herkömmliche Hosting-Anbieter sind überladen mit unübersichtlichen cPanels, versteckten Verlängerungskosten und langsamen Server-Bereitstellungen, die Entwickler und Unternehmen frustrieren.',
      decisions: 'Entwurf eines minimalistischen Kontrollzentrums mit Echtzeit-Ressourcenanzeigen (CPU/RAM/Bandbreite), automatisierten Zero-Downtime-Pipelines und globalem Multi-Region-Edge-Routing.',
      impact: 'zylo hostet erfolgreich über 10.000 aktive Websites weltweit mit einer 99,99% Uptime-Erfolgsquote und weltweiten TTFB-Antwortzeiten von unter 180 ms.',
      achievements: [
        {
          number: '99.99%',
          title: 'server-uptime-zuverlässigkeit',
          description: 'Höchste Hochverfügbarkeit durch verteiltes Multi-Region-Failover und automatisierte DDoS-Abwehr.'
        },
        {
          number: '< 180ms',
          title: 'globale ttfb-antwortzeit',
          description: 'Optimierte Verteilung statischer Assets und Edge-Caching über weltweite POP-Rechenzentren.'
        },
        {
          number: '10k+',
          title: 'gehostete aktive websites',
          description: 'Erfolgreiche Skalierung vom ersten Prototyp zu einer etablierten Plattform für Tausende von Entwicklern.'
        }
      ],
      screens: [
        { id: 'zylo-01', title: 'Hosting Control Hub', caption: 'Live-Cluster-Status, aktive Server-Instanzen und CDN-Durchsatz', type: 'canvas' },
        { id: 'zylo-02', title: 'Telemetrie & CDN-Flow', caption: 'Echtzeit-CPU/RAM-Auslastung, Anfrageraten und Edge-Latenzmonitore', type: 'analytics' },
        { id: 'zylo-03', title: 'DNS & Domain-Manager', caption: 'Sofortiges Record-Routing, automatisierte SSL-Zertifikate und Wildcard-Aliase', type: 'console' },
        { id: 'zylo-04', title: 'High-Speed Edge Shield', caption: 'Status globaler Edge-Knoten, intelligente Caching-Regeln und DDoS-Schutz', type: 'darkmode' },
        { id: 'zylo-05', title: '1-Klick-Deploy & Webhooks', caption: 'Git-Repository-Webhooks, Build-Logs und automatische Rollback-Punkte', type: 'hub' }
      ],
      metrics: [
        { label: 'Uptime SLA', value: '99.99%' },
        { label: 'Global TTFB', value: '< 180ms' },
        { label: 'Aktive Sites', value: '10,000+' }
      ],
      imageType: 'zylo',
      imageUrl: '/zylo.webp',
      liveUrl: 'https://zylo.ai',
      accentColor: '#6366f1',
      nextProjectId: 'trufin',
      nextProjectTitle: 'trufin | verifizierungsplattform für finanzinstitute & online-kredite'
    },
    {
      id: 'trufin',
      title: 'trufin | verifizierungsplattform für finanzinstitute & online-kredite',
      client: 'trufin verification',
      company: 'trufin verification',
      category: 'Fintech-Sicherheit & Institutsverifizierung',
      year: '2025',
      description: 'Eine umfassende öffentliche Plattform zur Verifizierung von Authentizität, behördlicher Lizenzierung und Risikostatus von Finanzinstituten, Fintech-Kreditgebern und Investment-Entitäten.',
      summary: 'Konzeption und Entwicklung des offiziellen Finanzprüfungsportals und der Betrugserkennungs-Engine zur sofortigen Unterscheidung legaler von illegalen Finanz-Apps.',
      role: 'lead product designer & frontend engineer',
      type: 'fintech-sicherheits- & verifizierungsplattform',
      tech: 'react, typescript, tailwind css, rest api, search indexer, figma',
      deliverables: ['Instituts-Verifizierungs-Engine', 'Fintech- & Kredit-Checker', 'Offizieller Lizenz-Radar', 'Community-Betrugs-Meldeportal'],
      problem: 'Die Zunahme illegaler Kredit-Apps und räuberischer Finanzbetrügereien, die offizielle Lizenzen fälschen, ohne dass Bürgern ein schnelles und zuverlässiges Prüfwerkzeug zur Verfügung steht.',
      decisions: 'Entwicklung einer blitzschnellen Suche mit Behörden-Abgleich, kontrastreichen Sicherheitsindikatoren (Verifiziert vs Gefährlich) und klaren Richtlinien.',
      impact: 'trufin hat Tausende Finanzunternehmen abgeglichen, über 50.000 betrügerische Links markiert und Hunderttausenden Nutzern finanzielle Sicherheit verschafft.',
      achievements: [
        {
          number: '100%',
          title: 'geprüftes behördenregister',
          description: 'Direkte Anbindung an behördliche Finanzregister für sofortige Legalitätsbestätigung.'
        },
        {
          number: '< 0.2s',
          title: 'sofortige verifizierungsabfrage',
          description: 'Entwicklung einer extrem schnellen Fuzzy-Suchmaschine für Lizenznummern und Firmennamen.'
        },
        {
          number: '50k+',
          title: 'erkannte betrugs- & illegale apps',
          description: 'Schutz der Verbraucher durch Katalogisierung unlizenzierter Klone und Phishing-Websites.'
        }
      ],
      screens: [
        { id: 'trufin-01', title: 'Instituts-Verifizierungs-Hub', caption: 'Sofortige Namens-/Lizenzsuche, offizielles Behördensiegel und Risikostufe', type: 'terminal' },
        { id: 'trufin-02', title: 'Fintech & Kredit-Radar', caption: 'Direkter Vergleich lizenzierter Fintechs gegenüber unbefugten Entitäten', type: 'chart' },
        { id: 'trufin-03', title: 'Lizenzprüfer', caption: 'Detaillierte Lizenzprüfung, gültige Firmenadresse und Regulierungsstatus', type: 'multisig' },
        { id: 'trufin-04', title: 'Mobiler Schnellprüfer', caption: 'Leichtgewichtige Web-App mit sofortiger QR- & APK-Paket-Validierung', type: 'mobile' },
        { id: 'trufin-05', title: 'Betrugs-Telemetrie & Blacklist', caption: 'Community-Warnungen, Sperrlisten und Erkennung verdächtiger Muster', type: 'risk' }
      ],
      metrics: [
        { label: 'Datenbank-Genauigkeit', value: '100%' },
        { label: 'Suchgeschwindigkeit', value: '< 0.2s' },
        { label: 'Geflaggte Entitäten', value: '50k+' }
      ],
      imageType: 'trufin',
      imageUrl: '/trufin.webp',
      liveUrl: 'https://trufin.io',
      accentColor: '#10b981',
      nextProjectId: 'krigstudio',
      nextProjectTitle: 'krigstudio | plattform für digitale einladungen & event-websites'
    },
    {
      id: 'krigstudio',
      title: 'krigstudio | plattform für digitale einladungen & event-websites',
      client: 'krigstudio',
      company: 'krigstudio',
      category: 'Digitale Einladungen & Event-Web-Builder',
      year: '2024',
      description: 'Ein eleganter, interaktiver Builder für digitale Einladungen, mit dem Paare und Eventplaner maßgeschneiderte Hochzeitswebsites mit RSVP, digitalen Geschenken und kuratierter Musik erstellen können.',
      summary: 'Ganzheitliche Entwicklung der Einladungsplattform und des Designsystems mit anpassbaren redaktionellen Layouts, Echtzeit-RSVP-Tracking und stimmungsvollem Hintergrundsound.',
      role: 'creator & lead frontend developer',
      type: 'plattform für digitale einladungen & events',
      tech: 'react, next.js, typescript, tailwind css, framer motion, web audio api, figma',
      deliverables: ['Digitaler Einladungs-Builder', 'Interaktiver RSVP- & Gästebuch-Hub', 'Digitaler Umschlag & QR-Transfer', 'Foto- & Musik-Galerie'],
      problem: 'Klassische Papiereinladungen sind teuer und unpraktisch, während Standard-Online-Vorlagen oft generisch, werbeüberladen und wenig emotional wirken.',
      decisions: 'Gestaltung einer zeitlosen Ästhetik mit butterweichen 60fps-Interaktionen, dynamischer Gästepersonalisierung, Live-Countdowns und automatischer RSVP-Synchronisierung.',
      impact: 'krigstudio hat bereits Einladungen für über 500 Hochzeiten bereitgestellt, bei einer 95% RSVP-Rückmeldequote und herausragendem Feedback.',
      achievements: [
        {
          number: '95%',
          title: 'rsvp-rückmeldequote',
          description: 'Optimierte digitale Bestätigungsabläufe für sekundenschnelle Rückmeldungen der Gäste.'
        },
        {
          number: '60fps',
          title: 'flüssige animationen & audio',
          description: 'Sensory-Hintergrundmusik und flüssige Fotobuch-Übergänge, optimiert für Mobilgeräte.'
        },
        {
          number: '500+',
          title: 'begleitete events & hochzeiten',
          description: 'Geschätzt von Paaren und Veranstaltern für einen unvergesslichen ersten Eindruck.'
        }
      ],
      screens: [
        { id: 'krig-01', title: 'Interaktive Einladungs-Leinwand', caption: 'Individuelle Cover-Enthüllung, animierte Love-Story und Live-Countdown', type: 'hero3d' },
        { id: 'krig-02', title: 'Dynamischer RSVP- & Wunsch-Feed', caption: 'Sofortige Teilnahmebestätigung, Gästebuch und Besucherzählung', type: 'reel' },
        { id: 'krig-03', title: 'Redaktionelle Farb- & Themenpalette', caption: 'Minimalistische Typografie, exklusive Farbpaletten und Foto-Slider', type: 'grid' },
        { id: 'krig-04', title: 'Sensory Audio & Navigation', caption: 'Kuratierte Hintergrundmusik kombiniert mit direkter Google-Maps-Navigation', type: 'sound' },
        { id: 'krig-05', title: 'Digitaler Umschlag & Geschenke', caption: 'Banküberweisung & E-Wallet-Integration, QR-Zahlung und Wunschliste', type: 'archive' }
      ],
      metrics: [
        { label: 'RSVP-Quote', value: '95%' },
        { label: 'Bildwiederholrate', value: '60 FPS' },
        { label: 'Events Gehostet', value: '500+' }
      ],
      imageType: 'krigstudio',
      imageUrl: '/krigstudio.webp',
      liveUrl: 'https://krigstudio.com',
      accentColor: '#09090b',
      nextProjectId: 'zylo',
      nextProjectTitle: 'zylo | hochperformantes web-hosting & cloud-plattform'
    }
  ],
  ja: [
    {
      id: 'zylo',
      title: 'zylo | 高性能Webホスティング & クラウドプラットフォーム',
      client: 'zylo hosting (ファウンダー)',
      company: 'zylo inc.',
      category: 'Webホスティング & クラウド基盤',
      year: '2025',
      description: '稼働率99.99%、グローバルエッジキャッシュ、即時DNS伝播、直感的な開発者向けダッシュボードを備えた次世代クラウドホスティングプラットフォーム。',
      summary: 'zyloのフルスタックWebホスティングアーキテクチャおよび管理コンソールを創業・設計・実装。カスタムサーバー監視、自動SSLプロビジョニング、シームレスなGit 1クリックデプロイを実現。',
      role: 'founder & lead architect',
      type: 'クラウドWebホスティング & サーバー基盤',
      tech: 'react, next.js, typescript, tailwind css, node.js, docker, edge cdn, figma',
      deliverables: ['クラウドホスティング管理コンソール', '1クリックGitデプロイエンジン', 'DNS & ドメイン管理機能', 'サーバーヘルス & CDNテレメトリ'],
      problem: '従来のWebホスティングは複雑な管理画面、不透明な更新費用、遅いサーバー構築など、開発者や企業にとって多くの摩擦が存在していました。',
      decisions: 'リアルタイムリソースゲージ（CPU/RAM/帯域）、ゼロダウンタイムの自動デプロイパイプライン、グローバルエッジルーティングを備えた洗練されたコントロールセンターを設計。',
      impact: '世界中で10,000件以上のアクティブなWebサイトを安定運用し、稼働率99.99%、グローバルTTFB応答時間180ms未満を達成。',
      achievements: [
        {
          number: '99.99%',
          title: 'サーバー稼働率の信頼性',
          description: '分散型マルチリージョンフェイルオーバーと自動DDoS緩和により最高水準の可用性を維持。'
        },
        {
          number: '< 180ms',
          title: 'グローバルTTFB応答速度',
          description: '世界各地のPOPデータセンターによる静的アセット最適化とエッジキャッシュで超高速ロードを実現。'
        },
        {
          number: '10k+',
          title: 'ホスティング中のWebサイト数',
          description: '初期プロトタイプから数千の開発者や企業に利用される基盤へとスケール。'
        }
      ],
      screens: [
        { id: 'zylo-01', title: 'ホスティング統合コンソール', caption: 'クラスタのリアルタイム稼働状況、アクティブサーバー、CDNスループット', type: 'canvas' },
        { id: 'zylo-02', title: 'テレメトリ & CDNモニタリング', caption: 'CPU/RAM使用率、リクエストレート、エッジレイテンシの可視化', type: 'analytics' },
        { id: 'zylo-03', title: 'DNS & ドメインマネージャー', caption: '即時レコード反映、自動SSL発行、ワイルドカードエイリアス設定', type: 'console' },
        { id: 'zylo-04', title: '高速エッジシールド', caption: 'グローバルエッジノード状態、インテリジェントキャッシュポリシー、DDoS防御', type: 'darkmode' },
        { id: 'zylo-05', title: '1クリックデプロイ & Webhook', caption: 'Gitリポジトリ連携、ビルドログ、自動ロールバックポイント', type: 'hub' }
      ],
      metrics: [
        { label: '稼働率 SLA', value: '99.99%' },
        { label: 'グローバル TTFB', value: '< 180ms' },
        { label: '稼働サイト数', value: '10,000+' }
      ],
      imageType: 'zylo',
      imageUrl: '/zylo.webp',
      liveUrl: 'https://zylo.ai',
      accentColor: '#6366f1',
      nextProjectId: 'trufin',
      nextProjectTitle: 'trufin | 金融機関・融資事業者検証プラットフォーム'
    },
    {
      id: 'trufin',
      title: 'trufin | 金融機関・融資事業者検証プラットフォーム',
      client: 'trufin verification',
      company: 'trufin verification',
      category: 'Fintechセキュリティ & 機関認証',
      year: '2025',
      description: '金融機関、Fintech融資事業者、投資ファンドの公式認可情報、正当性、およびリスクステータスを即座に確認できる公共検証インテリジェンスプラットフォーム。',
      summary: '公式金融検証ポータルおよび不正検知エンジンのUI設計と開発を担当。一般消費者や企業が悪質・違法な金融アプリを即座に判別できる仕組みを提供。',
      role: 'lead product designer & frontend engineer',
      type: 'Fintechセキュリティ & 検証Webプラットフォーム',
      tech: 'react, typescript, tailwind css, rest api, search indexer, figma',
      deliverables: ['機関検証エンジン', '融資・Fintechチェッカー', '公式ライセンスレーダー', 'コミュニティ不正通報ハブ'],
      problem: '公式認可を偽装した違法融資アプリや金融詐欺が横行する中、消費者が迅速かつ確実に真偽を確認できる公的ツールが不足していました。',
      decisions: '規制当局の登録データベースと完全照合する高速検索、高コントラストな安全指標バッジ（正規認可済み vs 危険/違法）、明快な法令ガイドラインを設計。',
      impact: '数千社におよぶ金融事業者のクロス照合を実施し、5万件以上の不正アプリ・リンクを検知・警告。数十万人のユーザーの資産安全に貢献。',
      achievements: [
        {
          number: '100%',
          title: '規制当局データベース完全照合',
          description: '公的金融機関のレジストリと直接連携し、瞬時に適法性を確認。'
        },
        {
          number: '< 0.2s',
          title: '超高速な照合レスポンス',
          description: '認可番号、アプリ名、法人名を一括検索できるファジー検索エンジンを実装。'
        },
        {
          number: '50k+',
          title: '違法・詐欺事業者の検知・警告',
          description: '無許可のクローンアプリやフィッシングサイトを網羅的にカタログ化し被害を防止。'
        }
      ],
      screens: [
        { id: 'trufin-01', title: '機関検証ポータル', caption: '事業者名・ライセンス番号の即時照合、公式認証バッジ、リスク度判定', type: 'terminal' },
        { id: 'trufin-02', title: 'Fintech & 融資レーダー', caption: '認可済み正規事業者と未認可ハイリスク業者の直接比較表示', type: 'chart' },
        { id: 'trufin-03', title: 'ライセンス真正性インスペクター', caption: '認可証書の詳細監査、法人所在地照合、管轄官庁ステータス', type: 'multisig' },
        { id: 'trufin-04', title: 'モバイルクイックチェッカー', caption: 'QRコードやAPKパッケージを瞬時に解析する軽量モバイルUI', type: 'mobile' },
        { id: 'trufin-05', title: '不正テレメトリ & ブラックリスト', caption: 'ユーザー通報に基づく不審パターン検知とリアルタイムブラックリスト', type: 'risk' }
      ],
      metrics: [
        { label: 'DB照合精度', value: '100%' },
        { label: '検索応答速度', value: '< 0.2s' },
        { label: '検知事業者数', value: '50k+' }
      ],
      imageType: 'trufin',
      imageUrl: '/trufin.webp',
      liveUrl: 'https://trufin.io',
      accentColor: '#10b981',
      nextProjectId: 'krigstudio',
      nextProjectTitle: 'krigstudio | デジタル招待状クリエイター & イベントWebビルダー'
    },
    {
      id: 'krigstudio',
      title: 'krigstudio | デジタル招待状クリエイター & イベントWebビルダー',
      client: 'krigstudio',
      company: 'krigstudio',
      category: 'デジタル招待状 & イベントWebプラットフォーム',
      year: '2024',
      description: '結婚式や特別なイベントのためのインタラクティブな招待状制作プラットフォーム。出欠確認（RSVP）、ご祝儀送金、BGM再生を美しく統合。',
      summary: 'エンドツーエンドの招待状作成システムとエディトリアルデザインシステムを構築。滑らかなスクロール演出、リアルタイムゲストブック、空間オーディオを搭載。',
      role: 'creator & lead frontend developer',
      type: 'デジタル招待状制作 & イベントプラットフォーム',
      tech: 'react, next.js, typescript, tailwind css, framer motion, web audio api, figma',
      deliverables: ['招待状ビルダー', 'インタラクティブRSVP & 芳名録ハブ', 'デジタルご祝儀 & QR送金', 'フォト & BGMギャラリー'],
      problem: '従来の紙の招待状はコストが高く出欠管理が困難で、既存のWeb招待状テンプレートは広告が多く洗練さに欠けていました。',
      decisions: '60fpsの心地よいスクロール、ゲスト名の動的パーソナライズ、リアルタイムカウントダウン、WhatsApp連携によるスムーズな出欠管理を実現。',
      impact: '500件以上の結婚式やイベントで導入され、95%の高いRSVP回答率を維持。洗練されたミニマルな美学で高い評価を獲得。',
      achievements: [
        {
          number: '95%',
          title: '出欠確認（RSVP）回答率',
          description: '数秒で回答と温かいメッセージを送信できる直感的な回答フロー。'
        },
        {
          number: '60fps',
          title: '滑らかなアニメーション & 音響',
          description: 'モバイルに最適化された心地よいBGMと写真アルバムの流麗なトランジション。'
        },
        {
          number: '500+',
          title: '開催されたイベント・挙式実績',
          description: '新郎新婦やイベント主催者から選ばれる、記憶に残る第一印象を演出。'
        }
      ],
      screens: [
        { id: 'krig-01', title: 'インタラクティブ招待状キャンバス', caption: '表紙のアニメーション、ふたりのストーリー年表、当日カウントダウン', type: 'hero3d' },
        { id: 'krig-02', title: '動的RSVP & お祝いメッセージ', caption: '即時出席確認、オンライン芳名録、リアルタイム人数集計', type: 'reel' },
        { id: 'krig-03', title: 'エディトリアルテーマパレット', caption: '洗練されたタイポグラフィ、上質なカラーパレット、フォトスライダー', type: 'grid' },
        { id: 'krig-04', title: '空間音響 & ルート案内', caption: '厳選されたBGMプレイヤーとGoogleマップ連動の会場ルート案内', type: 'sound' },
        { id: 'krig-05', title: 'デジタルご祝儀 & ギフト', caption: '銀行・電子マネー送金連携、決済QRコード自動生成、ギフトリスト', type: 'archive' }
      ],
      metrics: [
        { label: 'RSVP回答率', value: '95%' },
        { label: 'フレームレート', value: '60 FPS' },
        { label: 'サポート実績', value: '500+' }
      ],
      imageType: 'krigstudio',
      imageUrl: '/krigstudio.webp',
      liveUrl: 'https://krigstudio.com',
      accentColor: '#09090b',
      nextProjectId: 'zylo',
      nextProjectTitle: 'zylo | 高性能Webホスティング & クラウドプラットフォーム'
    }
  ]
};

export const PROJECTS_DATA = PROJECTS_BY_LANG.en;

export const getProjectsData = (lang: Language): Project[] => {
  return PROJECTS_BY_LANG[lang] || PROJECTS_BY_LANG.en;
};

export const PRINCIPLES_BY_LANG: Record<Language, string[]> = {
  id: [
    'sedikit bicara, lebih banyak bermakna',
    'kesederhanaan adalah kerja terkeras',
    'setiap detail adalah niat',
    'konsistensi membangun kepercayaan',
    'ketergesaan merusak keindahan'
  ],
  en: [
    'say less, tell more',
    'simplicity is the hardest work',
    'every detail is an intention',
    'consistency builds trust',
    'haste ruins the beautiful'
  ],
  de: [
    'weniger sagen, mehr erzählen',
    'einfachheit ist die härteste arbeit',
    'jedes detail ist eine absicht',
    'konsistenz schafft vertrauen',
    'eile ruiniert das schöne'
  ],
  ja: [
    '多くを語らず、深く伝える',
    'シンプルさは最も困難な仕事である',
    'すべてのディテールに意図を宿す',
    '一貫性が信頼を築く',
    '焦りは美しさを損なう'
  ]
};

export const PRINCIPLES_LIST = PRINCIPLES_BY_LANG.en;

export const getPrinciplesList = (lang: Language): string[] => {
  return PRINCIPLES_BY_LANG[lang] || PRINCIPLES_BY_LANG.en;
};

export const PHILOSOPHY_BY_LANG: Record<Language, PhilosophyItem[]> = {
  id: [
    {
      number: '01',
      title: 'estetika',
      headline: 'keindahan lahir bukan dari menambah, melainkan dari membuang. biarkan hanya yang dibutuhkan yang tersisa.',
      content: 'Kita sering keliru mengira ornamen adalah kualitas. Kejelasan visual sejati muncul ketika setiap komponen yang tidak penting disingkirkan hingga hanya niat utama yang bersinar. Bentuk tidak hanya mengikuti fungsi—ia mengangkat fungsi menjadi pengalaman yang tenang dan tanpa beban.'
    },
    {
      number: '02',
      title: 'entropi',
      headline: 'kekacauan adalah kondisi bawaan. keteraturan membutuhkan disiplin arsitektur yang disengaja.',
      content: 'Perangkat lunak dan sistem desain secara alami mengalami penurunan seiring waktu jika tidak diikat oleh aksioma dasar yang kuat. Dengan menciptakan struktur modular yang selaras secara matematis, kita menjaga kecepatan, konsistensi, dan ketenangan selama bertahun-tahun.'
    },
    {
      number: '03',
      title: 'rasionalitas',
      headline: 'setiap piksel dan baris kode harus membenarkan keberadaannya dengan tujuan.',
      content: 'Intuisi subjektif memicu hipotesis kreatif, namun logika yang ketat membuktikannya. Jika sebuah animasi memperlambat pengguna, buanglah. Jika sebuah elemen visual mengalihkan perhatian dari pesan, lepaskan. Tujuan adalah estetika tertinggi.'
    }
  ],
  en: [
    {
      number: '01',
      title: 'aesthetics',
      headline: 'beauty comes not from adding, but from taking away. let only what is needed remain.',
      content: 'We often conflate ornamentation with quality. True visual clarity emerges when every non-essential component is removed until only the core intention shines. Form should not only follow function—it should elevate function into an effortless, quiet experience.'
    },
    {
      number: '02',
      title: 'entropy',
      headline: 'chaos is the default state. order requires deliberate architectural discipline.',
      content: 'Software and design systems naturally deteriorate over time if not held together by strong foundational axioms. By creating modular, mathematically harmonious structures, we preserve speed, consistency, and sanity for decades.'
    },
    {
      number: '03',
      title: 'rationality',
      headline: 'every pixel and line of code must justify its existence with purpose.',
      content: 'Subjective intuition sparks the creative hypothesis, but rigorous logic proves it. If an animation delays the user, it is discarded. If a visual element distracts from the message, it is stripped. Purpose is the ultimate aesthetic.'
    }
  ],
  de: [
    {
      number: '01',
      title: 'ästhetik',
      headline: 'schönheit entsteht nicht durch hinzufügen, sondern durch weglassen. nur das wesentliche soll bleiben.',
      content: 'Wir verwechseln oft Dekoration mit Qualität. Wahre visuelle Klarheit entsteht, wenn jede unwesentliche Komponente entfernt wird, bis nur die Kernintention strahlt. Form folgt nicht nur der Funktion – sie erhebt die Funktion zu einer mühelosen, ruhigen Erfahrung.'
    },
    {
      number: '02',
      title: 'entropie',
      headline: 'chaos ist der standardzustand. ordnung erfordert bewusste architektonische disziplin.',
      content: 'Software und Designsysteme verfallen mit der Zeit, wenn sie nicht durch starke Fundamente zusammengehalten werden. Durch modulare, mathematisch harmonische Strukturen bewahren wir Geschwindigkeit, Konsistenz und Struktur.'
    },
    {
      number: '03',
      title: 'rationalität',
      headline: 'jeder pixel und jede zeile code muss seine existenz durch einen zweck rechtfertigen.',
      content: 'Subjektive Intuition entfacht die kreative Hypothese, doch strenge Logik beweist sie. Wenn eine Animation den Nutzer bremst, wird sie verworfen. Wenn ein Element ablenkt, wird es entfernt. Zweck ist die ultimative Ästhetik.'
    }
  ],
  ja: [
    {
      number: '01',
      title: '美意識',
      headline: '美しさは付け足すことではなく、削ぎ落とすことから生まれます。必要なものだけを残します。',
      content: '私たちはしばしば装飾を品質と混同します。真の視覚的明快さは、本質的な意図だけが輝くまで不要な要素を削ぎ落とした時に現れます。形態は機能に従うだけでなく、機能を静かで心地よい体験へと高めます。'
    },
    {
      number: '02',
      title: 'エントロピー',
      headline: '混沌こそが初期状態です。秩序には綿密な設計規律が求められます。',
      content: '強固な基盤がなければ、ソフトウェアやデザインシステムは時間の経過とともに劣化します。モジュール化され調和の取れた構造を築くことで、長期にわたる速度と一貫性を担保します。'
    },
    {
      number: '03',
      title: '合理性',
      headline: 'すべてのピクセルとコードの一行一行が、明確な目的を持って存在しなければなりません。',
      content: '直感はクリエイティブな仮説を生み出しますが、それを証明するのは論理です。体験を遅らせるアニメーションは排除され、メッセージを濁す装飾は削ぎ落とされます。目的こそが至高の美学です。'
    }
  ]
};

export const PHILOSOPHY_DATA = PHILOSOPHY_BY_LANG.en;

export const getPhilosophyData = (lang: Language): PhilosophyItem[] => {
  return PHILOSOPHY_BY_LANG[lang] || PHILOSOPHY_BY_LANG.en;
};

export const SERVICES_BY_LANG: Record<Language, ServiceItem[]> = {
  id: [
    {
      number: '01',
      title: 'desain produk & ui/ux',
      category: 'Desain & Strategi',
      description: 'Menerjemahkan alur kerja rumit menjadi antarmuka yang intuitif dan berpusat pada manusia dengan hierarki tipografi teliti, ritme spasial, dan tata letak responsif.',
      deliverables: ['Wireframing & Alur Pengguna', 'Design System Figma', 'Prototipe Interaktif', 'Audit Desain']
    },
    {
      number: '02',
      title: 'rekayasa frontend',
      category: 'Rekayasa',
      description: 'Membangun aplikasi sisi klien yang tangguh dan secepat kilat dengan React, TypeScript, dan perkakas modern. Arsitektur bersih yang dirancang untuk umur panjang.',
      deliverables: ['Arsitektur React & Next.js', 'Basis Kode TypeScript', 'Tailwind & Motion UI', 'Optimalisasi Kinerja']
    },
    {
      number: '03',
      title: 'design system & tokenisasi',
      category: 'Sistem & Skalabilitas',
      description: 'Merancang pustaka komponen modular dan mudah diakses yang menjembatani desain dan teknik, memungkinkan tim membangun lebih cepat dengan konsistensi matematis.',
      deliverables: ['Pustaka Komponen Atomik', 'Token Desain & Tema', 'Aksesibilitas (WCAG)', 'Dokumentasi Interaktif']
    },
    {
      number: '04',
      title: 'identitas merek digital & mikro-interaksi',
      category: 'Gerak & Identitas',
      description: 'Memberikan kepribadian unik pada produk melalui tipografi khusus, mikro-animasi ekspresif, umpan balik taktil, dan desain interaksi khas.',
      deliverables: ['Panduan Identitas Visual', 'Ikonografi Kustom', 'Mikro-animasi Halus', 'Penyempurnaan Interaktif']
    }
  ],
  en: [
    {
      number: '01',
      title: 'product & ui/ux design',
      category: 'Design & Strategy',
      description: 'Translating complex workflows into intuitive, human-centered interfaces with meticulous typographic hierarchy, spatial rhythm, and responsive layouts.',
      deliverables: ['Wireframing & User Flows', 'Figma Design Systems', 'Interactive Prototyping', 'Design Audits']
    },
    {
      number: '02',
      title: 'frontend engineering',
      category: 'Engineering',
      description: 'Building robust, blazingly fast client-side applications with React, TypeScript, and modern tooling. Clean, maintainable architecture engineered for longevity.',
      deliverables: ['React & Next.js Architecture', 'TypeScript Codebases', 'Tailwind & Motion UI', 'Performance Optimization']
    },
    {
      number: '03',
      title: 'design systems & tokenization',
      category: 'Systems & Scalability',
      description: 'Crafting modular, accessible component libraries that bridge design and engineering, allowing teams to build faster with mathematical consistency.',
      deliverables: ['Atomic Component Libraries', 'Design Tokens & Theming', 'Accessibility (WCAG)', 'Interactive Documentation']
    },
    {
      number: '04',
      title: 'digital brand identity & micro-interactions',
      category: 'Motion & Identity',
      description: 'Giving products an unmistakable personality through bespoke typography, expressive micro-animations, tactile feedback, and signature interaction design.',
      deliverables: ['Visual Identity Guidelines', 'Bespoke Iconography', 'Fluid Micro-animations', 'Interactive Polish']
    }
  ],
  de: [
    {
      number: '01',
      title: 'produkt- & ui/ux-design',
      category: 'Design & Strategie',
      description: 'Übersetzung komplexer Arbeitsabläufe in intuitive, benutzerzentrierte Interfaces mit präziser typografischer Hierarchie und responsiven Layouts.',
      deliverables: ['Wireframing & User Flows', 'Figma Design-Systeme', 'Interaktives Prototyping', 'Design-Audits']
    },
    {
      number: '02',
      title: 'frontend-engineering',
      category: 'Entwicklung',
      description: 'Entwicklung robuster, blitzschneller Client-Anwendungen mit React, TypeScript und modernen Tools. Saubere Architektur für Langlebigkeit.',
      deliverables: ['React & Next.js Architektur', 'TypeScript Codebases', 'Tailwind & Motion UI', 'Performance-Optimierung']
    },
    {
      number: '03',
      title: 'design-systeme & tokenisierung',
      category: 'Systeme & Skalierbarkeit',
      description: 'Modulare, barrierefreie Komponentenbibliotheken, die Design und Engineering mit mathematischer Konsistenz verbinden.',
      deliverables: ['Atomare Komponenten-Bibliotheken', 'Design-Tokens & Theming', 'Barrierefreiheit (WCAG)', 'Interaktive Dokumentation']
    },
    {
      number: '04',
      title: 'digitale markenidentität & mikro-interaktionen',
      category: 'Motion & Identität',
      description: 'Unverwechselbare Produktpersönlichkeit durch individuelle Typografie, ausdrucksstarke Mikro-Animationen und haptisches Feedback.',
      deliverables: ['Visuelle Identitätsrichtlinien', 'Individuelle Ikonografie', 'Flüssige Mikro-Animationen', 'Interaktiver Feinschliff']
    }
  ],
  ja: [
    {
      number: '01',
      title: 'プロダクト & UI/UX デザイン',
      category: 'デザイン & 戦略',
      description: '緻密なタイポグラフィとレスポンシブなレイアウトにより、複雑なワークフローを直感的で人間中心のUIへと翻訳します。',
      deliverables: ['ワイヤーフレーム & ユーザーフロー', 'Figmaデザインシステム', 'インタラクティブプロトタイプ', 'デザイン監査']
    },
    {
      number: '02',
      title: 'フロントエンドエンジニアリング',
      category: 'エンジニアリング',
      description: 'React、TypeScript、モダンツールを駆使し、堅牢で高速なクライアントアプリケーションを構築します。',
      deliverables: ['React & Next.js アーキテクチャ', 'TypeScriptコードベース', 'Tailwind & Motion UI', 'パフォーマンス最適化']
    },
    {
      number: '03',
      title: 'デザインシステム & トークン設計',
      category: 'システム & 拡張性',
      description: 'デザインとエンジニアリングを架橋するモジュール式コンポーネントライブラリを構築します。',
      deliverables: ['Atomicデザインライブラリ', 'デザイントークン & テーマ設定', 'アクセシビリティ (WCAG)', '対話型ドキュメント']
    },
    {
      number: '04',
      title: 'デジタルブランド & マイクロインタラクション',
      category: 'モーション & アイデンティティ',
      description: '独自のタイポグラフィ、繊細なアニメーション、心地よい触覚フィードバックでプロダクトの魅力を引き出します。',
      deliverables: ['ビジュアルアイデンティティ', 'カスタムアイコン制作', '流麗なマイクロアニメーション', 'インタラクションの磨き込み']
    }
  ]
};

export const SERVICES_DATA = SERVICES_BY_LANG.en;

export const getServicesData = (lang: Language): ServiceItem[] => {
  return SERVICES_BY_LANG[lang] || SERVICES_BY_LANG.en;
};

export const STATS_BY_LANG: Record<Language, StatItem[]> = {
  id: [
    {
      number: '05',
      suffix: '+',
      label: 'tahun berkarya',
      sublabel: 'mendesain & mengkodekan antarmuka digital yang tangguh'
    },
    {
      number: '30',
      suffix: '+',
      label: 'rilis terkirim',
      sublabel: 'dari portal publik hingga platform industri iot'
    },
    {
      number: '100',
      suffix: 'k+',
      label: 'pengguna aktif',
      sublabel: 'berinteraksi dengan perangkat lunak setiap hari'
    },
    {
      number: '99',
      suffix: '.9%',
      label: 'skor kinerja',
      sublabel: 'ringan, aksesibel & bebas dari kode berlebih'
    }
  ],
  en: [
    {
      number: '05',
      suffix: '+',
      label: 'years of craft',
      sublabel: 'designing & coding resilient digital interfaces'
    },
    {
      number: '30',
      suffix: '+',
      label: 'shipped releases',
      sublabel: 'from municipal portals to iot industrial platforms'
    },
    {
      number: '100',
      suffix: 'k+',
      label: 'active citizens & users',
      sublabel: 'interfacing with delivered software daily'
    },
    {
      number: '99',
      suffix: '.9%',
      label: 'performance score',
      sublabel: 'lightweight, accessible & zero bloat engineering'
    }
  ],
  de: [
    {
      number: '05',
      suffix: '+',
      label: 'jahre erfahrung',
      sublabel: 'gestaltung & entwicklung robuster digitaler interfaces'
    },
    {
      number: '30',
      suffix: '+',
      label: 'veröffentlichte projekte',
      sublabel: 'von stadtportalen bis zu iot-industrieplattformen'
    },
    {
      number: '100',
      suffix: 'k+',
      label: 'aktive nutzer',
      sublabel: 'die täglich mit den lösungen interagieren'
    },
    {
      number: '99',
      suffix: '.9%',
      label: 'performance-score',
      sublabel: 'schlank, barrierefrei und kompromisslos optimiert'
    }
  ],
  ja: [
    {
      number: '05',
      suffix: '+',
      label: '年の制作実績',
      sublabel: '堅牢で美しいデジタルインターフェースの設計と実装'
    },
    {
      number: '30',
      suffix: '+',
      label: 'リリース実績',
      sublabel: '公共ポータルからIoT産業プラットフォームまで'
    },
    {
      number: '100',
      suffix: 'k+',
      label: 'アクティブユーザー',
      sublabel: '日々開発したプロダクトを利用するユーザー数'
    },
    {
      number: '99',
      suffix: '.9%',
      label: 'パフォーマンススコア',
      sublabel: '軽量・アクセシブル・無駄のないエンジニアリング'
    }
  ]
};

export const STATS_DATA = STATS_BY_LANG.en;

export const getStatsData = (lang: Language): StatItem[] => {
  return STATS_BY_LANG[lang] || STATS_BY_LANG.en;
};

export const FAQ_BY_LANG: Record<Language, FAQItem[]> = {
  id: [
    {
      number: '01',
      question: 'bagaimana alur kerja umum anda dari konsep hingga kode?',
      answer: 'Saya memulai dengan analisis mendalam untuk membedah kebutuhan inti dan batasan produk. Dari situ, saya membuat prototipe komponen berpresisi tinggi di Figma, menyempurnakan gerak/tipografi, lalu menerjemahkannya ke dalam kode TypeScript/React siap produksi dengan konsistensi tata letak matematis.',
      tags: ['alur-kerja', 'proses', 'rekayasa']
    },
    {
      number: '02',
      question: 'bagaimana kita berkolaborasi dan berkomunikasi selama proyek?',
      answer: 'Transparansi dan kejelasan asinkron adalah hal mendasar. Kita berkomunikasi via Slack/Discord, membagikan prototipe Figma interaktif untuk umpan balik awal, dan menyediakan link staging pratinjau berkelanjutan di setiap pencapaian agar Anda dapat menguji kemajuan nyata secara langsung.',
      tags: ['komunikasi', 'jarak-jauh', 'staging']
    },
    {
      number: '03',
      question: 'apakah anda bisa mengerjakan hanya lingkup desain atau hanya teknik?',
      answer: 'Ya. Meskipun kekuatan utama saya adalah menggabungkan kedua bidang sebagai Desainer Rekayasa hibrida, saya rutin menerima kontrak desain sistem UI/UX independen atau bertindak sebagai insinyur frontend senior untuk tim yang membutuhkan eksekusi berkualitas tinggi.',
      tags: ['lingkup', 'fleksibilitas', 'hibrida']
    },
    {
      number: '04',
      question: 'berapa lama estimasi waktu pengerjaan untuk sebuah proyek?',
      answer: 'Sprint desain produk komprehensif atau MVP frontend biasanya memakan waktu 3 hingga 6 minggu tergantung kompleksitas. Untuk design system enterprise atau platform full-stack, durasi umumnya 2 hingga 3 bulan dengan target dua mingguan yang terstruktur.',
      tags: ['jadwal', 'pengiriman', 'sprint']
    },
    {
      number: '05',
      question: 'apakah anda menyediakan dukungan pasca peluncuran dan dokumentasi?',
      answer: 'Setiap proyek diselesaikan dengan dokumentasi arsitektur lengkap, panduan token desain, riwayat commit yang bersih, dan masa garansi paska peluncuran untuk menjamin serah terima tim yang mulus dan tanpa kendala.',
      tags: ['dokumentasi', 'dukungan', 'garansi']
    }
  ],
  en: [
    {
      number: '01',
      question: 'what is your typical workflow from concept to code?',
      answer: 'I start with rigorous discovery to dissect the core product requirements and constraints. From there, I prototype directly in high-fidelity Figma components, refine motion/typography, and translate designs into production-ready TypeScript/React code with mathematical layout consistency.',
      tags: ['workflow', 'process', 'engineering']
    },
    {
      number: '02',
      question: 'how do we collaborate and communicate during a project?',
      answer: 'Transparency and asynchronous clarity are foundational. We sync via Slack/Discord, share interactive Figma prototypes for early feedback, and deploy continuous preview staging links with every codebase milestone so you can test real-time progress.',
      tags: ['communication', 'remote', 'staging']
    },
    {
      number: '03',
      question: 'can you work on design-only or engineering-only scopes?',
      answer: 'Yes. While my core strength lies in bridging both worlds as a hybrid Design Engineer, I regularly take on standalone UI/UX system design contracts or step in as a senior frontend engineer for existing teams needing high-touch execution.',
      tags: ['scope', 'hybrid', 'flexibility']
    },
    {
      number: '04',
      question: 'what is your typical turnaround timeline for a project?',
      answer: 'A comprehensive product design sprint or MVP frontend usually spans 3 to 6 weeks depending on domain complexity. For enterprise design systems or full-stack platforms, engagements typically run 2 to 3 months with structured bi-weekly milestones.',
      tags: ['timeline', 'delivery', 'sprints']
    },
    {
      number: '05',
      question: 'do you provide post-launch support and handoff documentation?',
      answer: 'Every project concludes with comprehensive architectural documentation, design token guidelines, clean commit history, and a dedicated post-launch warranty period to guarantee seamless team handoff and zero downtime.',
      tags: ['handoff', 'docs', 'support']
    }
  ],
  de: [
    {
      number: '01',
      question: 'wie sieht ihr typischer workflow von der idee zum code aus?',
      answer: 'Ich beginne mit einer gründlichen Analyse der Kernanforderungen. Anschließend erstelle ich High-Fidelity-Prototypen in Figma, verfeinere Typografie und Animationen und übersetze diese in produktionsreifen TypeScript/React-Code mit mathematischer Präzision.',
      tags: ['workflow', 'prozess', 'entwicklung']
    },
    {
      number: '02',
      question: 'wie arbeiten und kommunizieren wir während des projekts?',
      answer: 'Transparenz und asynchrone Klarheit stehen an erster Stelle. Wir nutzen Slack/Discord, teilen Figma-Prototypen und stellen kontinuierliche Staging-Links bereit, damit Sie den Fortschritt jederzeit live testen können.',
      tags: ['kommunikation', 'remote', 'staging']
    },
    {
      number: '03',
      question: 'übernehmen sie auch reine design- oder entwicklungsaufträge?',
      answer: 'Ja. Obwohl meine größte Stärke als Design-Engineer in der Schnittstelle beider Welten liegt, übernehme ich regelmäßig eigenständige UI/UX-Aufträge oder unterstütze Teams als Senior Frontend Engineer.',
      tags: ['flexibilität', 'design', 'frontend']
    },
    {
      number: '04',
      question: 'wie lange dauert ein typisches projekt?',
      answer: 'Ein umfassender Produkt-Design-Sprint oder ein Frontend-MVP dauert meist 3 bis 6 Wochen. Bei größeren Unternehmenssystemen liegt der Zeitrahmen typischerweise bei 2 bis 3 Monaten mit zweiwöchigen Meilensteinen.',
      tags: ['zeitplan', 'meilensteine', 'sprints']
    },
    {
      number: '05',
      question: 'bieten sie support nach dem launch und dokumentation?',
      answer: 'Jedes Projekt schließt mit einer detaillierten Dokumentation, Design-Token-Richtlinien, sauberer Git-Historie und einer Post-Launch-Garantiephase ab.',
      tags: ['dokumentation', 'support', 'übergabe']
    }
  ],
  ja: [
    {
      number: '01',
      question: 'コンセプトからコードへの開発プロセスはどのようになっていますか？',
      answer: '本質的な要件と制約を洗い出すリサーチから始めます。Figmaで高精度なプロトタイプを作成し、タイポグラフィやモーションを調整した後、ピクセル単位で正確なTypeScript/Reactコードへと実装します。',
      tags: ['ワークフロー', 'プロセス', '開発']
    },
    {
      number: '02',
      question: 'プロジェクト期間中のコミュニケーション体制はどうなりますか？',
      answer: '透明性と非同期での明快な共有を重視しています。SlackやDiscordでの連絡、Figmaでのレビュー、定期的なステージング環境へのデプロイにより、常にリアルタイムで進捗をご確認いただけます。',
      tags: ['コミュニケーション', 'リモート', 'ステージング']
    },
    {
      number: '03',
      question: 'デザインのみ、またはフロントエンド開発のみの依頼は可能ですか？',
      answer: 'はい、可能です。デザインエンジニアとして両領域を繋ぐことを得意としていますが、UI/UXデザイン単体のご依頼や、シニアフロントエンドエンジニアとしての開発支援も柔軟に承っております。',
      tags: ['柔軟性', 'デザイン', 'エンジニアリング']
    },
    {
      number: '04',
      question: '標準的な制作期間はどのくらいですか？',
      answer: 'プロダクトデザインやMVPフロントエンド開発は通常3〜6週間程度です。大規模なデザインシステムやフルスタック基盤の構築は、2週間ごとのマイルストーンを設定し2〜3ヶ月程度で進行します。',
      tags: ['スケジュール', 'マイルストーン', '納期']
    },
    {
      number: '05',
      question: '納品後のサポートやドキュメント作成は含まれますか？',
      answer: '全プロジェクトにおいて、詳細な設計ドキュメント、デザイントークン仕様、クリーンなコミット履歴、および円滑な引き継ぎのためのローンチ後サポート期間を提供しています。',
      tags: ['ドキュメント', 'サポート', '納品']
    }
  ]
};

export const FAQ_DATA = FAQ_BY_LANG.en;

export const getFaqData = (lang: Language): FAQItem[] => {
  return FAQ_BY_LANG[lang] || FAQ_BY_LANG.en;
};

export const TRANSLATIONS = {
  id: {
    getInTouch: 'hubungi saya',
    menu: 'menu',
    close: 'tutup',
    lendAnEar: 'dengarkan suasana',
    playingAmbient: 'suara ambient aktif',
    heyIm: 'halo, saya',
    nameBracket: '[steward jason liuwindra]',
    introRole: 'saya mendesain, dan saya menulis kode. yang saya pedulikan adalah membuat yang rumit menjadi sederhana — dan yang sederhana menjadi bermakna.',
    quoteCenter: 'saya tidak terburu-buru. saya membiarkan setiap baris dan setiap ruang kosong seolah-olah akan bertahan selama bertahun-tahun.',
    myStory: 'cerita saya',
    principlesLabel: '[prinsip]',
    thoughtLabel: '[pemikiran]',
    thoughtIntro: 'sebuah antarmuka lahir bukan dari piksel, tetapi dari keputusan. saya melepaskan yang tidak perlu dan hanya menyisakan makna.',
    readHowIThink: 'baca cara saya berpikir',
    servicesLabel: '[layanan]',
    servicesIntro: 'dari desain antarmuka konseptual hingga rekayasa frontend berkinerja tinggi, saya membantu mengubah ide kompleks menjadi produk digital yang matang dan bermakna.',
    discussProject: 'diskusikan proyek',
    videoStoriesLabel: '[jenis kegiatan & video]',
    videoStoriesTitle: 'apa yang kami lakukan',
    videoStoriesIntro: 'kami bangga dengan kemampuan kami menciptakan produk digital dan video cerita yang tidak hanya memenuhi tetapi melampaui ekspektasi.',
    statsLabel: '[dampak & angka]',
    statsIntro: 'metrik dan pencapaian terukur selama bertahun-tahun merancang dan membangun arsitektur digital.',
    faqLabel: '[tanya jawab / faq]',
    faqIntro: 'jawaban lugas seputar proses kerja sama, alur pengembangan, dan standar kualitas.',
    buildTag: '[belum selesai]',
    buildBrand: 'jason',
    buildFullName: 'steward jason liuwindra',
    buildHeading: 'apa yang anda lihat sejauh ini adalah versi yang saya pilih.',
    buildSub: 'sisanya belum dirancang.',
    contactLabel: '[kontak]',
    linksLabel: '[tautan]',
    connectLabel: '[terhubung]',
    home: 'beranda',
    aboutme: 'tentang saya',
    manifest: 'manifesto',
    projects: 'proyek',
    services: 'layanan',
    faq: 'faq',
    instagram: 'instagram',
    github: 'github',
    designedBy: 'designed by jason © 2026',
    works: 'karya',
    all: 'semua',
    filterWeb: 'website hosting & cloud',
    filterFintech: 'verifikasi instansi & pinjol',
    filterInvitation: 'pembuat undangan digital',
    noProjects: 'tidak ada proyek yang cocok dengan filter ini',
    contactHeadline: 'silakan hubungi saya untuk menjadwalkan pertemuan daring atau mengajukan pertanyaan apapun.',
    contactSub: 'senang berbicara tentang ide baru, pengembangan produk, atau arsitektur sistem antarmuka pengguna.',
    letsTalk: "[mari bicara]",
    nameSurname: 'nama lengkap',
    company: 'perusahaan / instansi',
    email: 'email',
    phone: 'nomor telepon (opsional)',
    subject: 'subjek pesan',
    message: 'pesan anda',
    sendMessage: 'kirim pesan',
    messageSent: 'pesan anda berhasil terkirim!',
    messageSentDesc: 'saya akan segera menghubungi anda kembali. terima kasih atas waktunya.',
    sendAnother: 'kirim pesan baru',
    allRights: 'hak cipta dilindungi undang-undang',
    notFoundTitle: '[404]',
    notFoundDesc: 'halaman ini tidak ada. mungkin memang tidak pernah ada.',
    backHome: 'kembali ke beranda',
    backToWorks: '• kembali ke karya',
    clickToZoom: 'klik untuk memperbesar',
    nextWork: 'karya selanjutnya •',
    marqueeWord: 'obsesi • kesempurnaan • obsesi • kesempurnaan • obsesi • kesempurnaan • obsesi • kesempurnaan • '
  },
  en: {
    getInTouch: 'get in touch',
    menu: 'menu',
    close: 'close',
    lendAnEar: 'lend an ear',
    playingAmbient: 'ambient sound playing',
    heyIm: "hey, i'm",
    nameBracket: '[steward jason liuwindra]',
    introRole: 'i design, and i write code. what i care about is making the complex simple — and the simple meaningful.',
    quoteCenter: "i don't rush. i leave every line and every empty space as if it will stay for years.",
    myStory: 'my story',
    principlesLabel: '[principles]',
    thoughtLabel: '[thought]',
    thoughtIntro: 'an interface is born not from pixels, but from decisions. i let go of the needless and leave only meaning behind.',
    readHowIThink: 'read how i think',
    servicesLabel: '[services]',
    servicesIntro: 'from conceptual interface design to high-performance frontend engineering, i help turn ambiguous ideas into polished digital products with purpose.',
    discussProject: 'discuss a project',
    statsLabel: '[impact & metrics]',
    statsIntro: 'measurable milestones across years of bridging design and software architecture.',
    faqLabel: '[faq / inquiries]',
    faqIntro: 'honest answers to frequent questions regarding collaboration, tooling, and execution.',
    buildTag: '[not the end]',
    buildBrand: 'jason',
    buildFullName: 'steward jason liuwindra',
    buildHeading: 'what you have seen so far was the version i chose.',
    buildSub: 'the rest has not been designed yet.',
    contactLabel: '[contact]',
    linksLabel: '[links]',
    connectLabel: '[connect]',
    home: 'home',
    aboutme: 'aboutme',
    manifest: 'manifest',
    projects: 'projects',
    services: 'services',
    faq: 'faq',
    instagram: 'instagram',
    github: 'github',
    designedBy: 'designed by jason © 2026',
    works: 'works',
    all: 'all',
    filterWeb: 'web hosting & cloud',
    filterFintech: 'fintech & loan verification',
    filterInvitation: 'digital invitation builder',
    noProjects: 'no projects match this filter',
    contactHeadline: 'please contact me to set up an online meeting or ask any questions you have.',
    contactSub: 'happy to discuss new ideas, product engineering, or interface design systems.',
    letsTalk: "[let's talk]",
    nameSurname: 'name, surname',
    company: 'company',
    email: 'email',
    phone: 'phone (optional)',
    subject: 'subject',
    message: 'message',
    sendMessage: 'send message',
    messageSent: 'message sent successfully!',
    messageSentDesc: 'i will get back to you as soon as possible. thank you for reaching out.',
    sendAnother: 'send another message',
    allRights: 'all rights reserved',
    notFoundTitle: '[404]',
    notFoundDesc: "this page doesn't exist. maybe it never did.",
    backHome: 'back to home',
    backToWorks: '• back to works',
    clickToZoom: 'click to zoom screen',
    nextWork: 'next work •',
    marqueeWord: 'obsession • perfection • obsession • perfection • obsession • perfection • obsession • perfection • '
  },
  de: {
    getInTouch: 'kontakt aufnehmen',
    menu: 'menü',
    close: 'schließen',
    lendAnEar: 'hintergrundsound',
    playingAmbient: 'ambient-sound aktiv',
    heyIm: 'hallo, ich bin',
    nameBracket: '[steward jason liuwindra]',
    introRole: 'ich gestalte und schreibe code. mir geht es darum, komplexes einfach zu machen – und einfaches bedeutungsvoll.',
    quoteCenter: 'ich überstürze nichts. ich setze jede linie und jeden freiraum so, als bliebe er über jahre bestehen.',
    myStory: 'meine geschichte',
    principlesLabel: '[prinzipien]',
    thoughtLabel: '[gedanken]',
    thoughtIntro: 'ein interface entsteht nicht aus pixelraster, sondern aus entscheidungen. ich reduziere das unnötige und lasse nur das wesentliche.',
    readHowIThink: 'meine denkweise lesen',
    servicesLabel: '[leistungen]',
    servicesIntro: 'von konzeptionellem interface-design bis hin zu hochperformantem frontend-engineering – ich verwandle vage ideen in ausgereifte digitale produkte.',
    discussProject: 'projekt besprechen',
    statsLabel: '[wirkung & kennzahlen]',
    statsIntro: 'messbare meilensteine aus jahren der verbindung von design und software-architektur.',
    faqLabel: '[faq / fragen]',
    faqIntro: 'ehrliche antworten zu zusammenarbeit, werkzeugen und umsetzung.',
    buildTag: '[nicht das ende]',
    buildBrand: 'jason',
    buildFullName: 'steward jason liuwindra',
    buildHeading: 'was sie bisher gesehen haben, war die version, die ich gewählt habe.',
    buildSub: 'der rest wurde noch nicht entworfen.',
    contactLabel: '[kontakt]',
    linksLabel: '[links]',
    connectLabel: '[verbinden]',
    home: 'startseite',
    aboutme: 'über mich',
    manifest: 'manifest',
    projects: 'projekte',
    services: 'leistungen',
    faq: 'faq',
    instagram: 'instagram',
    github: 'github',
    designedBy: 'designed by jason © 2026',
    works: 'arbeiten',
    all: 'alle',
    filterWeb: 'web-hosting & cloud',
    filterFintech: 'fintech & kreditverifizierung',
    filterInvitation: 'digitale einladungen',
    noProjects: 'keine projekte entsprechen diesem filter',
    contactHeadline: 'kontaktieren sie mich gerne, um ein online-meeting zu vereinbaren oder fragen zu stellen.',
    contactSub: 'ich freue mich auf den austausch über neue ideen, produktentwicklung oder designsysteme.',
    letsTalk: '[lassen sie uns sprechen]',
    nameSurname: 'name, vorname',
    company: 'unternehmen',
    email: 'e-mail',
    phone: 'telefon (optional)',
    subject: 'betreff',
    message: 'nachricht',
    sendMessage: 'nachricht senden',
    messageSent: 'nachricht erfolgreich gesendet!',
    messageSentDesc: 'ich werde mich so schnell wie möglich bei ihnen melden. vielen dank!',
    sendAnother: 'weitere nachricht senden',
    allRights: 'alle rechte vorbehalten',
    notFoundTitle: '[404]',
    notFoundDesc: 'diese seite existiert nicht. vielleicht hat sie nie existiert.',
    backHome: 'zurück zur startseite',
    backToWorks: '• zurück zu den werken',
    clickToZoom: 'klicken zum vergrößern',
    nextWork: 'nächstes werk •',
    marqueeWord: 'besessenheit • perfektion • besessenheit • perfektion • besessenheit • perfektion • besessenheit • perfektion • '
  },
  ja: {
    getInTouch: 'お問い合わせ',
    menu: 'メニュー',
    close: '閉じる',
    lendAnEar: '環境音を聴く',
    playingAmbient: '環境音を再生中',
    heyIm: 'こんにちは、',
    nameBracket: '[steward jason liuwindra]',
    introRole: '私はデザインし、コードを書きます。複雑なものをシンプルにし、シンプルなものに意味を持たせることを大切にしています。',
    quoteCenter: '決して急ぎません。すべての線とすべての余白を、何年も残り続けるかのように刻みます。',
    myStory: '自己紹介',
    principlesLabel: '[原則]',
    thoughtLabel: '[思考]',
    thoughtIntro: 'インターフェースはピクセルからではなく、決断から生まれます。不要なものを削ぎ落とし、本質的な意味だけを残します。',
    readHowIThink: '思考のプロセスを読む',
    servicesLabel: '[サービス]',
    servicesIntro: '概念的なUI/UX設計から高性能なフロントエンド開発まで、曖昧なアイデアを目的を持ったデジタルプロダクトへ昇華させます。',
    discussProject: 'プロジェクトを相談する',
    statsLabel: '[実績と指標]',
    statsIntro: 'デザインとソフトウェア設計の架け橋として積み重ねてきた確かなマイルストーン。',
    faqLabel: '[よくある質問]',
    faqIntro: 'コラボレーション体制、使用ツール、納期に関する実践的な回答。',
    buildTag: '[終わりではない]',
    buildBrand: 'jason',
    buildFullName: 'steward jason liuwindra',
    buildHeading: 'これまでに目にしたものは、私が選んだバージョンです。',
    buildSub: '残りはまだデザインされていません。',
    contactLabel: '[連絡先]',
    linksLabel: '[リンク]',
    connectLabel: '[ソーシャル]',
    home: 'ホーム',
    aboutme: 'プロフィール',
    manifest: 'マニフェスト',
    projects: 'プロジェクト',
    services: 'サービス',
    faq: 'よくある質問',
    instagram: 'instagram',
    github: 'github',
    designedBy: 'designed by jason © 2026',
    works: '実績',
    all: 'すべて',
    filterWeb: 'Webホスティング & クラウド',
    filterFintech: '金融・融資検証',
    filterInvitation: 'デジタル招待状',
    noProjects: '条件に一致するプロジェクトがありません',
    contactHeadline: 'オンラインミーティングのご相談やご質問など、どうぞお気軽にお問い合わせください。',
    contactSub: '新規プロダクト開発、UI/UX設計、デザインシステム構築など、あらゆるご相談を歓迎します。',
    letsTalk: '[ご相談・お問い合わせ]',
    nameSurname: 'お名前',
    company: '会社名・組織名',
    email: 'メールアドレス',
    phone: 'お電話番号（任意）',
    subject: '件名',
    message: 'お問い合わせ内容',
    sendMessage: 'メッセージを送信',
    messageSent: 'メッセージが正常に送信されました！',
    messageSentDesc: '確認次第、折り返しご連絡いたします。お問い合わせありがとうございます。',
    sendAnother: '別のメッセージを送信する',
    allRights: 'all rights reserved',
    notFoundTitle: '[404]',
    notFoundDesc: 'お探しのページは見つかりませんでした。',
    backHome: 'ホームに戻る',
    backToWorks: '• 実績一覧へ戻る',
    clickToZoom: 'クリックして拡大',
    nextWork: '次の実績 •',
    marqueeWord: '執着 • 完璧 • 執着 • 完璧 • 執着 • 完璧 • 執着 • 完璧 • '
  }
};
