export const config = {
  api: { bodyParser: true },
};

// ── Constants ──────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://prodify.cc', 'https://www.prodify.cc'];
const MODEL           = 'claude-haiku-4-5-20251001';
const MAX_TOKENS      = 1500;
const MAX_MESSAGES    = 20;

// Rate limits (requests per day)
const LIMIT_PRO       = 40;

const SB_URL          = 'https://kvezrezhicjlhycghucr.supabase.co';

// ── Helpers ────────────────────────────────────────────────────────────────

// Verify the Supabase JWT and return the user's UUID, or null if invalid
async function verifyJwt(token) {
  try {
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': process.env.SUPABASE_ANON_KEY || '',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id || null;
  } catch {
    return null;
  }
}

// Fetch the user row (is_pro + rate limit fields) using the service role key
async function getUserRow(authId) {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/users?auth_id=eq.${authId}&select=is_pro,username,ai_requests_today,ai_requests_reset_at`,
      {
        headers: {
          'apikey':         process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization':  `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

// Increment today's request count, resetting if it's a new day
async function incrementRequestCount(authId, currentCount, resetAt) {
  const now       = new Date();
  const todayUTC  = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const lastReset = (resetAt || '').slice(0, 10);
  const newCount  = lastReset === todayUTC ? currentCount + 1 : 1;

  await fetch(
    `${SB_URL}/rest/v1/users?auth_id=eq.${authId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey':         process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization':  `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        'Content-Type':   'application/json',
        'Prefer':         'return=minimal',
      },
      body: JSON.stringify({
        ai_requests_today:    newCount,
        ai_requests_reset_at: now.toISOString(),
      }),
    }
  ).catch(() => {});

  return newCount;
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {

  // ── CORS ──
  const origin = req.headers.origin || '';
  if (process.env.NODE_ENV !== 'development' && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth ──
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const authId = await verifyJwt(token);
  if (!authId) return res.status(401).json({ error: 'Invalid session' });

  // ── Pro check (server-side — client cannot bypass) ──
  const userRow = await getUserRow(authId);
  const isPro   = !!(userRow?.is_pro);

  if (!isPro) {
    return res.status(403).json({ error: 'AI Daily Planner is a Pro feature. Upgrade to access it.', pro_required: true });
  }

  // ── Rate limit (Pro only) ──
  const todayUTC   = new Date().toISOString().slice(0, 10);
  const lastReset  = (userRow?.ai_requests_reset_at || '').slice(0, 10);
  const todayCount = lastReset === todayUTC ? (userRow?.ai_requests_today || 0) : 0;

  if (todayCount >= LIMIT_PRO) {
    return res.status(429).json({
      error: `Daily limit reached (${LIMIT_PRO} requests/day). Resets at midnight UTC.`,
      limit: LIMIT_PRO,
      used: todayCount,
    });
  }

  // ── Parse + validate body ──
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: `Too many messages (max ${MAX_MESSAGES})` });
  }

  // ── Strip messages down to role + content only — no prompt injection via extra fields ──
  const safeMessages = body.messages.map(m => ({
    role:    m.role === 'assistant' ? 'assistant' : 'user',
    content: typeof m.content === 'string' ? m.content.slice(0, 8000) : '',
  })).filter(m => m.content.length > 0);

  // ── API keys ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfiguration' });

  // ── Call Anthropic ──
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,       // always hardcoded — client cannot override
        max_tokens: MAX_TOKENS,  // always hardcoded — client cannot override
        messages:   safeMessages,
      }),
    });

    // Increment usage count after a successful call
    await incrementRequestCount(authId, todayCount, userRow?.ai_requests_reset_at);

    const data = await upstream.json();
    // Attach remaining count so client can show it
    data._usage = { used: todayCount + 1, limit, is_pro: isPro };
    return res.status(upstream.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Upstream error' });
  }
}
