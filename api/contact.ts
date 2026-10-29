const ACTIVE_TELEGRAM_BOT_TOKEN = '8459837666:AAHY7tsADTJ9jvpDYfXKQXXvog3Cwo4Mwf0';
const TELEGRAM_CHAT_ID = '6196850470';

function sanitizeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req: any, res: any) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { name, email, company, phone, subject, message, source, honeypot } = req.body || {};

    if (honeypot && String(honeypot).trim().length > 0) {
      return res.status(200).json({ ok: true, message: 'Message sent successfully.' });
    }

    if (!name || String(name).trim().length < 1) {
      return res.status(200).json({ ok: false, error: 'Nama wajib diisi.' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return res.status(200).json({ ok: false, error: 'Format email tidak valid.' });
    }

    if (!message || String(message).trim().length < 2) {
      return res.status(200).json({ ok: false, error: 'Pesan terlalu pendek.' });
    }

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
🌐 <b>Sumber Form:</b> ${sanitizeHtml(source || 'Portfolio Vercel')}
⏰ <b>Waktu:</b> <code>${timestamp} WIB</code>
━━━━━━━━━━━━━━━━━━━━━
💬 <b>Pesan:</b>
${sanitizeHtml(message)}
`.trim();

    const botToken = process.env.TELEGRAM_BOT_TOKEN || ACTIVE_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedTelegramText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const tgData = (await tgResponse.json()) as { ok?: boolean };

    if (!tgResponse.ok || !tgData.ok) {
      return res.status(200).json({ ok: false, error: 'Gagal meneruskan pesan ke bot Telegram.' });
    }

    return res.status(200).json({ ok: true, message: 'Pesan berhasil terkirim.' });
  } catch {
    return res.status(200).json({ ok: false, error: 'Terjadi masalah pada server.' });
  }
}
