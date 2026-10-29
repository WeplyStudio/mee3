/**
 * Dual-Layer Telegram Notification Service
 * Primary: Dispatches via server-side proxy (/api/contact) for anti-spam & rate limiting.
 * Fallback: Direct API failover to ensure 100% delivery even on static previews or network glitches.
 */

const CF_WORKER_URL = 'https://hello-world-sparkling-meadow-630c.matchboxdevelopment.workers.dev';

export interface ContactMessagePayload {
  name: string;
  email: string;
  message: string;
  company?: string;
  phone?: string;
  subject?: string;
  source?: string;
  honeypot?: string;
  formLoadTime?: number;
}

export interface SendNotificationResult {
  success: boolean;
  error?: string;
}

const FALLBACK_BOT_TOKEN = '8459837666:AAHY7tsADTJ9jvpDYfXKQXXvog3Cwo4Mwf0';
const FALLBACK_CHAT_ID = '6196850470';

function sanitizeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Dispatches contact message with automatic failover
 */
export async function sendTelegramNotification(
  payload: ContactMessagePayload
): Promise<SendNotificationResult> {
  // If honeypot is filled, silent drop
  if (payload.honeypot && payload.honeypot.trim().length > 0) {
    return { success: true };
  }

  // 1. Try Primary Server Proxy (/api/contact or Cloudflare Worker)
  const contactUrls = [
    `${CF_WORKER_URL}/api/contact`,
    '/api/contact'
  ];

  for (const url of contactUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          message: payload.message,
          company: payload.company,
          phone: payload.phone,
          subject: payload.subject,
          source: payload.source || 'Portfolio Website',
          honeypot: payload.honeypot || '',
          formLoadTime: payload.formLoadTime || Date.now(),
        }),
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data && data.ok) {
          return { success: true };
        }
        if (data && data.error && !data.error.includes('server')) {
          return { success: false, error: data.error };
        }
      }
    } catch {
      // Try next URL in list or fall over
    }
  }

  // 2. Secondary Direct Failover Dispatch
  try {
    const timestamp = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    const formattedTelegramText = `
✨ <b>PESAN BARU DARI PORTOFOLIO</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama:</b> ${sanitizeHtml(payload.name)}
📧 <b>Email:</b> ${sanitizeHtml(payload.email)}
🏢 <b>Perusahaan:</b> ${sanitizeHtml(payload.company || '-')}
📱 <b>Telepon:</b> ${sanitizeHtml(payload.phone || '-')}
📌 <b>Subjek:</b> ${sanitizeHtml(payload.subject || 'Diskusi Proyek')}
🌐 <b>Sumber Form:</b> ${sanitizeHtml(payload.source || 'Direct Gateway')}
⏰ <b>Waktu:</b> <code>${timestamp} WIB</code>
━━━━━━━━━━━━━━━━━━━━━
💬 <b>Pesan:</b>
${sanitizeHtml(payload.message)}
`.trim();

    const directRes = await fetch(
      `https://api.telegram.org/bot${FALLBACK_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: FALLBACK_CHAT_ID,
          text: formattedTelegramText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );

    const directData = (await directRes.json()) as { ok?: boolean };
    if (directRes.ok && directData.ok) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Gagal mengirim pesan ke Telegram. Silakan coba kembali.',
    };
  } catch {
    return {
      success: false,
      error: 'Terjadi gangguan jaringan saat mengirim pesan.',
    };
  }
}
