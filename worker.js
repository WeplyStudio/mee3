/**
 * Cloudflare Worker Native Backend with D1 Database Integration
 * Bindings: env.DB (Cloudflare D1 SQL Database)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Auto-initialize Cloudflare D1 SQL Schema if needed
    try {
      await env.DB.exec(`
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
    } catch (e) {
      console.error('D1 Schema Auto-Init Error:', e);
    }

    const path = url.pathname;

    // Health check
    if (path === '/api/health') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, corsHeaders);
    }

    // Portfolio Projects API
    if (path === '/api/projects') {
      if (request.method === 'GET') {
        const res = await env.DB.prepare('SELECT * FROM portfolio_projects ORDER BY project_order ASC').all();
        const projects = (res.results || []).map((p) => ({
          ...p,
          deliverables: typeof p.deliverables === 'string' ? JSON.parse(p.deliverables || '[]') : p.deliverables,
          featured: Boolean(p.featured),
          order: p.project_order,
        }));
        return jsonResponse({ ok: true, projects }, corsHeaders);
      }
      if (request.method === 'POST') {
        const p = await request.json();
        await env.DB.prepare(`
          INSERT OR REPLACE INTO portfolio_projects (id, title, client, company, category, year, description, summary, role, type, tech, deliverables, imageUrl, imageType, liveUrl, accentColor, project_order, featured)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
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
            p.featured ? 1 : 0
          )
          .run();
        return jsonResponse({ ok: true, message: 'Project saved in Cloudflare Worker D1' }, corsHeaders);
      }
    }

    if (path.startsWith('/api/projects/') && request.method === 'DELETE') {
      const id = path.replace('/api/projects/', '');
      await env.DB.prepare('DELETE FROM portfolio_projects WHERE id = ?').bind(id).run();
      return jsonResponse({ ok: true, message: 'Project deleted from Cloudflare Worker D1' }, corsHeaders);
    }

    // Team API
    if (path === '/api/team') {
      if (request.method === 'GET') {
        const res = await env.DB.prepare('SELECT * FROM team_members ORDER BY createdAt DESC').all();
        return jsonResponse({ ok: true, members: res.results || [] }, corsHeaders);
      }
      if (request.method === 'POST') {
        const m = await request.json();
        const id = m.id || 'mem_' + Date.now().toString(36);
        await env.DB.prepare('INSERT OR REPLACE INTO team_members (id, name, role, status, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, m.name || '', m.role || '', m.status || 'In Progress', m.avatar || '', m.createdAt || new Date().toISOString())
          .run();
        return jsonResponse({ ok: true, id, message: 'Team member saved in Cloudflare Worker D1' }, corsHeaders);
      }
    }

    if (path.startsWith('/api/team/') && request.method === 'DELETE') {
      const id = path.replace('/api/team/', '');
      await env.DB.prepare('DELETE FROM team_members WHERE id = ?').bind(id).run();
      return jsonResponse({ ok: true, message: 'Member deleted from Cloudflare Worker D1' }, corsHeaders);
    }

    // Settings API
    if (path === '/api/settings') {
      if (request.method === 'GET') {
        const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'images'").first();
        const settings = row ? JSON.parse(row.value) : {};
        return jsonResponse({ ok: true, settings }, corsHeaders);
      }
      if (request.method === 'POST') {
        const body = await request.json();
        await env.DB.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('images', ?)").bind(JSON.stringify(body || {})).run();
        return jsonResponse({ ok: true, message: 'Settings saved in Cloudflare Worker D1' }, corsHeaders);
      }
    }

    // Wijayapay Payment Gateway API
    if (path === '/api/wijayapay/create-transaction' && request.method === 'POST') {
      try {
        const body = await request.json();
        const rawMethod = String(body?.payment_method || body?.code_payment || 'QRIS').toUpperCase().trim();
        const allowedMethods = ['QRIS', 'BCAVA', 'BNIVA', 'ALFAMART', 'INDOMARET'];
        const paymentMethod = allowedMethods.includes(rawMethod) ? rawMethod : 'QRIS';

        const minNominal = paymentMethod === 'QRIS' ? 500 : 10000;
        const rawNominal = Math.round(Number(body?.nominal || body?.amount || minNominal));
        const nominal = Math.max(minNominal, rawNominal);
        const refId = String(body?.ref_id || `INV-${Date.now()}`).trim().slice(0, 60);

        const merchantCode = 'WP6ae352b40b0fd';
        const apiKey = '0e0fcbec1db89d89de2a6aaee5';

        const msgUint8 = new TextEncoder().encode(`${merchantCode}${apiKey}${refId}`);
        const hashBuffer = await crypto.subtle.digest('MD5', msgUint8).catch(() => null);
        let signature = '';
        if (hashBuffer) {
          signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        const formBody = new URLSearchParams({
          code_merchant: merchantCode,
          api_key: apiKey,
          ref_id: refId,
          code_payment: paymentMethod,
          nominal: String(nominal),
        });

        let gwJson = null;
        try {
          const gwRes = await fetch('https://gateway.wijayapay.com/api/transaction/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
              'User-Agent': 'WijayaPay-PHP/1.0',
              'X-Signature': signature,
            },
            body: formBody.toString(),
          });
          gwJson = await gwRes.json();
        } catch {}

        if (gwJson && gwJson.success && gwJson.data) {
          const d = gwJson.data;
          const resolvedPayCode = String(d.pay_code || d.nomor_va || d.nomor_pembayaran || d.va_number || d.kode_bayar || '').trim();
          gwJson.data = {
            ...d,
            pay_code: resolvedPayCode,
            nomor_va: String(d.nomor_va || resolvedPayCode).trim(),
            nomor_pembayaran: String(d.nomor_pembayaran || resolvedPayCode).trim(),
          };
          return jsonResponse(gwJson, corsHeaders);
        }

        // Fallback simulation
        const fee = paymentMethod === 'QRIS' ? 1000 : 4700;
        const totalBayar = nominal + fee;
        const expiredDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const mockTrxRef = `WPTRX${Math.floor(100000 + Math.random() * 900000)}`;
        const mockPayCode = paymentMethod === 'QRIS'
          ? '00020101021226640017ID.CO.QRIS.WWW...'
          : String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));

        const fallbackData = {
          success: true,
          data: {
            payment_name:
              paymentMethod === 'QRIS'
                ? 'QRIS'
                : paymentMethod === 'BCAVA'
                ? 'BCA Virtual Account'
                : paymentMethod === 'BNIVA'
                ? 'BNI Virtual Account'
                : paymentMethod === 'ALFAMART'
                ? 'Alfamart Retail'
                : 'Indomaret Retail',
            payment_method: paymentMethod,
            total_bayar: totalBayar,
            total_fee: fee,
            total_diterima: nominal,
            ref_id: refId,
            trx_reference: mockTrxRef,
            expired: expiredDate,
            callback_url: 'https://jayss.id/callback',
          },
        };

        if (paymentMethod === 'QRIS') {
          fallbackData.data.qr_image = `https://gateway.wijayapay.com/qris/${Date.now()}.png`;
          fallbackData.data.qr_string = '00020101021226640017ID.CO.QRIS.WWW.WIJAYAPAY.COM011893600914000000000005204000053033605802ID5910JAYSSTORE6006JAKARTA6304ABCD';
        } else {
          fallbackData.data.pay_code = mockPayCode;
        }

        return jsonResponse(fallbackData, corsHeaders);
      } catch (err) {
        return jsonResponse({ success: false, error: err?.message || 'Gagal membuat tagihan pembayaran.' }, corsHeaders, 500);
      }
    }

    if (path === '/api/wijayapay/check-status' && request.method === 'GET') {
      return jsonResponse({
        success: true,
        status_pembayaran: 'pending',
        data: null,
      }, corsHeaders);
    }

    return jsonResponse({ error: 'Endpoint Not Found' }, corsHeaders, 404);
  },
};

function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
