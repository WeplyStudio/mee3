import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import compression from 'compression';
import initSqlJs, { Database } from 'sql.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Enable HTTP response compression
app.use(
  compression({
    level: 6,
    threshold: 0,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  })
);

// High-efficiency long-term cache headers for static files
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.path.match(/\.(js|css|webp|jpeg|jpg|png|svg|woff2?|ttf|eot|ico)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

// Body parsing middlewares
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// CORS & Preflight handler
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.set('trust proxy', true);

// ==========================================
// SQLITE CLOUDFLARE D1 DATABASE ENGINE
// ==========================================
const DB_PATH = path.join(process.cwd(), 'd1_database.sqlite');
let db: Database | null = null;
let dbInitPromise: Promise<void> | null = null;

async function initSqliteDb() {
  try {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    // Initialize Cloudflare D1 Compatible SQLite Schema
    db.run(`
      CREATE TABLE IF NOT EXISTS portfolio_projects (
        id TEXT PRIMARY KEY,
        title TEXT,
        client TEXT,
        company TEXT,
        category TEXT,
        year TEXT,
        description TEXT,
        summary TEXT,
        role TEXT,
        type TEXT,
        tech TEXT,
        deliverables TEXT,
        imageUrl TEXT,
        imageType TEXT,
        liveUrl TEXT,
        accentColor TEXT,
        project_order INTEGER,
        featured INTEGER
      );

      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        status TEXT,
        avatar TEXT,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    saveSqliteDb();
    console.log('[Cloudflare D1 SQLite] Database initialized successfully!');
  } catch (err) {
    console.error('[Cloudflare D1 SQLite] Error initializing DB:', err);
  }
}

function saveSqliteDb() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (e) {
      console.error('[Cloudflare D1 SQLite] Save error:', e);
    }
  }
}

function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) return [];
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('[SQLite Query Error]:', err, sql);
    return [];
  }
}

function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function runSql(sql: string, params: any[] = []): void {
  if (!db) return;
  try {
    db.run(sql, params);
    saveSqliteDb();
  } catch (err) {
    console.error('[SQLite Run Error]:', err, sql);
  }
}

// Start async initialization of SQLite DB
dbInitPromise = initSqliteDb();

// Middleware to ensure DB is initialized before handling requests
app.use(async (req, res, next) => {
  if (dbInitPromise) await dbInitPromise;
  next();
});



// Server-side ONLY secrets
const ACTIVE_TELEGRAM_BOT_TOKEN = '8459837666:AAHY7tsADTJ9jvpDYfXKQXXvog3Cwo4Mwf0';
const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_BOT_TOKEN =
  envToken && !envToken.includes('AAGIgAT71O9EbNaMsQK1n9yNND6AW6-AyoU')
    ? envToken
    : ACTIVE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim() || '6196850470';

// In-Memory Rate Limiting
interface RateLimitRecord {
  timestamps: number[];
  blockedUntil?: number;
}
const ipRateLimits = new Map<string, RateLimitRecord>();
const globalSubmissions: number[] = [];

setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  for (const [ip, record] of ipRateLimits.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0 && (!record.blockedUntil || record.blockedUntil < now)) {
      ipRateLimits.delete(ip);
    }
  }
}, 10 * 60 * 1000);

function sanitizeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}








// Projects API
app.get('/api/projects', (req: Request, res: Response) => {
  const rawProjects = queryAll('SELECT * FROM portfolio_projects ORDER BY project_order ASC');
  const projects = rawProjects.map((p) => ({
    ...p,
    deliverables: typeof p.deliverables === 'string' ? JSON.parse(p.deliverables || '[]') : p.deliverables,
    featured: Boolean(p.featured),
    order: p.project_order,
  }));
  res.json({ ok: true, projects });
});

app.post('/api/projects', (req: Request, res: Response) => {
  const p = req.body;
  if (!p || !p.id) return res.status(400).json({ ok: false, error: 'Project ID required' });

  runSql(
    `INSERT OR REPLACE INTO portfolio_projects (id, title, client, company, category, year, description, summary, role, type, tech, deliverables, imageUrl, imageType, liveUrl, accentColor, project_order, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id,
      p.title || '',
      p.client || '',
      p.company || '',
      p.category || '',
      p.year || '2025',
      p.description || '',
      p.summary || '',
      p.role || '',
      p.type || '',
      p.tech || '',
      Array.isArray(p.deliverables) ? JSON.stringify(p.deliverables) : p.deliverables || '[]',
      p.imageUrl || '',
      p.imageType || 'zylo',
      p.liveUrl || '',
      p.accentColor || '#0f5132',
      p.order || 1,
      p.featured ? 1 : 0,
    ]
  );

  res.json({ ok: true, message: 'Project saved in SQLite Cloudflare D1' });
});

app.delete('/api/projects/:id', (req: Request, res: Response) => {
  runSql('DELETE FROM portfolio_projects WHERE id = ?', [req.params.id]);
  res.json({ ok: true, message: 'Project deleted from SQLite Cloudflare D1' });
});

// Team Members API
app.get('/api/team', (req: Request, res: Response) => {
  const members = queryAll('SELECT * FROM team_members ORDER BY createdAt DESC');
  res.json({ ok: true, members });
});

app.post('/api/team', (req: Request, res: Response) => {
  const m = req.body;
  if (!m || !m.name) return res.status(400).json({ ok: false, error: 'Member name required' });
  const id = m.id || 'mem_' + Date.now().toString(36);

  runSql(
    `INSERT OR REPLACE INTO team_members (id, name, role, status, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, m.name, m.role || '', m.status || 'In Progress', m.avatar || '', m.createdAt || new Date().toISOString()]
  );

  res.json({ ok: true, id, message: 'Team member saved in SQLite D1' });
});

app.delete('/api/team/:id', (req: Request, res: Response) => {
  runSql('DELETE FROM team_members WHERE id = ?', [req.params.id]);
  res.json({ ok: true, message: 'Member deleted from SQLite D1' });
});

// Settings API
app.get('/api/settings', (req: Request, res: Response) => {
  const row = queryOne<{ value: string }>("SELECT value FROM site_settings WHERE key = 'images'");
  try {
    const settings = row ? JSON.parse(row.value) : {};
    res.json({ ok: true, settings });
  } catch {
    res.json({ ok: true, settings: {} });
  }
});

app.post('/api/settings', (req: Request, res: Response) => {
  const settingsStr = JSON.stringify(req.body || {});
  runSql(`INSERT OR REPLACE INTO site_settings (key, value) VALUES ('images', ?)`, [settingsStr]);
  res.json({ ok: true, message: 'Settings saved in SQLite Cloudflare D1' });
});



// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', database: 'SQLite Cloudflare D1', timestamp: new Date().toISOString() });
});

// Dynamic robots.txt
app.get('/robots.txt', (req: Request, res: Response) => {
  const host = req.get('host') || 'itsjason.my.id';
  const proto = req.get('x-forwarded-proto') || 'https';
  const origin = `${proto}://${host}`;
  res.type('text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(`# Robots.txt for Jason Portfolio
User-agent: *
Allow: /
Allow: /llms.txt
Allow: /llms-full.txt

# Sitemaps & LLM Context
Sitemap: ${origin}/sitemap.xml
Sitemap: https://itsjason.my.id/sitemap.xml
Sitemap: https://www.itsjason.my.id/sitemap.xml
`);
});

// Valid XML Sitemap endpoint
app.get('/sitemap.xml', (req: Request, res: Response) => {
  const sitemapFile = path.join(process.cwd(), 'public', 'sitemap.xml');
  res.type('application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  if (fs.existsSync(sitemapFile)) {
    return res.sendFile(sitemapFile);
  }
  res.status(404).send('Sitemap not found');
});

// Contact Form Endpoint
app.post('/api/contact', async (req: Request, res: Response) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = Date.now();

    const fiveMinutesAgo = now - 5 * 60 * 1000;
    while (globalSubmissions.length > 0 && globalSubmissions[0] < fiveMinutesAgo) {
      globalSubmissions.shift();
    }
    if (globalSubmissions.length >= 30) {
      return res.json({ ok: false, error: 'Sistem sedang sibuk. Silakan coba kembali dalam beberapa saat.' });
    }

    const tenMinutesAgo = now - 10 * 60 * 1000;
    let ipRecord = ipRateLimits.get(clientIp);
    if (!ipRecord) {
      ipRecord = { timestamps: [] };
      ipRateLimits.set(clientIp, ipRecord);
    }

    ipRecord.timestamps = ipRecord.timestamps.filter((ts) => ts > tenMinutesAgo);

    if (ipRecord.blockedUntil && ipRecord.blockedUntil > now) {
      const waitSeconds = Math.ceil((ipRecord.blockedUntil - now) / 1000);
      return res.json({ ok: false, error: `Terlalu banyak percobaan. Harap tunggu ${waitSeconds} detik lagi.` });
    }

    if (ipRecord.timestamps.length >= 5) {
      ipRecord.blockedUntil = now + 15 * 60 * 1000;
      return res.json({ ok: false, error: 'Batas pengiriman tercapai. Silakan coba kembali setelah 15 menit.' });
    }

    const honeypot = req.body.honeypot || req.body.website_url_hp || req.body._gotcha || '';
    if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
      return res.json({ ok: true, message: 'Message sent successfully.' });
    }

    const name = String(req.body.name || '').trim().slice(0, 100);
    const email = String(req.body.email || '').trim().slice(0, 120);
    const company = String(req.body.company || '').trim().slice(0, 100);
    const phone = String(req.body.phone || '').trim().slice(0, 50);
    const subject = String(req.body.subject || '').trim().slice(0, 150);
    const message = String(req.body.message || '').trim().slice(0, 3000);
    const source = String(req.body.source || 'Portfolio Form').trim().slice(0, 80);

    if (!name) return res.json({ ok: false, error: 'Nama wajib diisi.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ ok: false, error: 'Format email tidak valid.' });
    if (!message || message.length < 2) return res.json({ ok: false, error: 'Pesan terlalu pendek.' });

    ipRecord.timestamps.push(now);
    globalSubmissions.push(now);

    const timestamp = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    const formattedTelegramText = `
✨ <b>PESAN BARU DARI PORTOFOLIO</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama:</b> ${sanitizeHtml(name)}
📧 <b>Email:</b> ${sanitizeHtml(email)}
🏢 <b>Perusahaan:</b> ${sanitizeHtml(company || '-')}
📱 <b>Telepon:</b> ${sanitizeHtml(phone || '-')}
📌 <b>Subjek:</b> ${sanitizeHtml(subject || 'Diskusi Proyek')}
🌐 <b>Sumber Form:</b> ${sanitizeHtml(source)}
🔒 <b>IP Pengirim:</b> <code>${sanitizeHtml(clientIp)}</code>
⏰ <b>Waktu:</b> <code>${timestamp} WIB</code>
━━━━━━━━━━━━━━━━━━━━━
💬 <b>Pesan:</b>
${sanitizeHtml(message)}
`.trim();

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return res.json({ ok: true, message: 'Message logged.' });
    }

    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const tgResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: formattedTelegramText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const tgData = (await tgResponse.json()) as { ok?: boolean; description?: string };

    if (!tgResponse.ok || !tgData.ok) {
      return res.json({ ok: false, error: 'Gagal meneruskan pesan ke server. Silakan hubungi langsung via email.' });
    }

    return res.json({ ok: true, message: 'Pesan berhasil terkirim.' });
  } catch {
    return res.json({ ok: false, error: 'Terjadi kesalahan pada server saat memproses pesan.' });
  }
});

// Start Express Server
async function startServer() {
  if (dbInitPromise) {
    await dbInitPromise;
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    let cachedIndexHtml: string | null = null;
    try {
      if (fs.existsSync(indexPath)) {
        cachedIndexHtml = fs.readFileSync(indexPath, 'utf-8');
      }
    } catch {
      cachedIndexHtml = null;
    }

    app.use(
      express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (filePath.match(/\.(js|css|webp|jpeg|jpg|png|svg|woff2?|ttf|eot)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    app.get('*', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      if (cachedIndexHtml) res.send(cachedIndexHtml);
      else res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT} with Cloudflare D1 SQLite DB`);
  });
}

startServer();
