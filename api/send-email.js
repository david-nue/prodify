export const config = { runtime: 'edge' };

const RESEND_KEY      = process.env.RESEND_API_KEY;
const SB_URL          = 'https://kvezrezhicjlhycghucr.supabase.co';
const SB_ANON_KEY     = process.env.SUPABASE_ANON_KEY || '';
const ALLOWED_ORIGINS = ['https://prodify.cc', 'https://www.prodify.cc'];

// Verify the Supabase JWT and return the user object, or null if invalid
async function verifyJwt(token) {
  try {
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SB_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Block requests from disallowed origins in production
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
  }

  // ── Auth: require a valid Supabase JWT ──
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: corsHeaders });
  }

  const user = await verifyJwt(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: corsHeaders });
  }

  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: corsHeaders });
  }

  try {
    const { to, subject, html, from, reply_to } = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     from      || 'Prodify <hello@mail.prodify.cc>',
        reply_to: reply_to  || 'prodifysupport@gmail.com',
        to:       Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
