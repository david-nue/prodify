export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8kb', // checkout requests are tiny
    },
  },
};

const ALLOWED_ORIGINS     = ['https://prodify.cc', 'https://www.prodify.cc'];

// Simple in-memory rate limit: max 10 checkout attempts per user per hour
// (Vercel functions are stateless so this resets on cold start — good enough to block basic abuse)
const _checkoutAttempts = new Map();
function checkoutRateLimit(authId) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const max = 10;
  const key = authId;
  const entry = _checkoutAttempts.get(key);
  if (!entry || now - entry.ts > windowMs) {
    _checkoutAttempts.set(key, { ts: now, count: 1 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
const SB_URL              = 'https://kvezrezhicjlhycghucr.supabase.co';
const SB_ANON_KEY         = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZXpyZXpoaWNqbGh5Y2dodWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzMxMTMsImV4cCI6MjA4ODQ0OTExM30.-Gb6LHePwJ0yK54e0POijp_6qVwg1gqtiAj3pN8sKF8';

const VARIANT_MONTHLY     = '1414303';
const VARIANT_YEARLY      = '1414306';

// ── Helpers ────────────────────────────────────────────────────────────────

async function verifyJwt(token) {
  try {
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SB_ANON_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data || null;
  } catch { return null; }
}

async function getUserRow(authId) {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/users?auth_id=eq.${authId}&select=username,ls_subscription_id,ls_customer_id,is_pro`,
      {
        headers: {
          'apikey':        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch { return null; }
}

async function createCheckoutUrl(variantId, email, username) {
  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Content-Type':  'application/vnd.api+json',
      'Accept':        'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email,
            custom: { username },
          },
          product_options: {
            redirect_url:     'https://prodify.cc?pro=1',
            receipt_link_url: 'https://prodify.cc?pro=1',
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: process.env.LEMONSQUEEZY_STORE_ID },
          },
          variant: {
            data: { type: 'variants', id: String(variantId) },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LS checkout error: ${err}`);
  }

  const data = await res.json();
  return data?.data?.attributes?.url || null;
}

async function getPortalUrl(customerId) {
  const res = await fetch(
    `https://api.lemonsqueezy.com/v1/customers/${customerId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept':        'application/vnd.api+json',
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.attributes?.urls?.customer_portal || null;
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  if (process.env.NODE_ENV !== 'development' && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Guard — ensure env vars are set
  if (!process.env.LEMONSQUEEZY_API_KEY || !process.env.LEMONSQUEEZY_STORE_ID) {
    return res.status(500).json({ error: 'Payment system not configured' });
  }

  // Auth
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const authUser = await verifyJwt(token);
  if (!authUser) return res.status(401).json({ error: 'Invalid session' });

  // Rate limit checkout creation
  if (!checkoutRateLimit(authUser.id)) {
    return res.status(429).json({ error: 'Too many checkout attempts. Please wait an hour before trying again.' });
  }

  const userRow = await getUserRow(authUser.id);
  if (!userRow) return res.status(404).json({ error: 'User not found' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const action = body?.action; // 'checkout_monthly' | 'checkout_yearly' | 'portal'

  try {
    // ── Customer portal (manage/cancel subscription) ──
    if (action === 'portal') {
      if (!userRow.ls_customer_id) {
        return res.status(400).json({ error: 'No active subscription found' });
      }
      const portalUrl = await getPortalUrl(userRow.ls_customer_id);
      if (!portalUrl) return res.status(500).json({ error: 'Could not get portal URL' });
      return res.status(200).json({ url: portalUrl });
    }

    // ── Checkout ──
    const variantId = action === 'checkout_yearly' ? VARIANT_YEARLY : VARIANT_MONTHLY;
    const email     = authUser.email || '';
    const username  = userRow.username || '';

    const checkoutUrl = await createCheckoutUrl(variantId, email, username);
    if (!checkoutUrl) return res.status(500).json({ error: 'Could not create checkout' });

    return res.status(200).json({ url: checkoutUrl });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
