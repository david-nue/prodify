import crypto from 'crypto';

export const config = {
  api: { bodyParser: false }, // raw body needed for signature verification
};

const SB_URL             = 'https://kvezrezhicjlhycghucr.supabase.co';
const ALLOWED_ORIGINS    = ['https://prodify.cc', 'https://www.prodify.cc'];

// ── Helpers ────────────────────────────────────────────────────────────────

function serviceHeaders() {
  return {
    'apikey':        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  };
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    const MAX_SIZE = 1024 * 1024; // 1MB cap
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        reject(new Error('Payload too large'));
        return;
      }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function verifySignature(rawBody, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function getUserByEmail(email) {
  const res = await fetch(
    `${SB_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,auth_id,is_pro`,
    { headers: serviceHeaders() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

async function setProStatus(authId, isPro, subData = {}) {
  const res = await fetch(
    `${SB_URL}/rest/v1/users?auth_id=eq.${authId}`,
    {
      method: 'PATCH',
      headers: serviceHeaders(),
      body: JSON.stringify({
        is_pro,
        ls_subscription_id:     subData.subscriptionId     || null,
        ls_variant_id:          subData.variantId          || null,
        ls_customer_id:         subData.customerId         || null,
        ls_subscription_status: subData.status             || null,
        ls_renews_at:           subData.renewsAt           || null,
        ls_ends_at:             subData.endsAt             || null,
        pro_updated_at:         new Date().toISOString(),
      }),
    }
  );
  return res.ok;
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'Webhook secret not configured' });

  // Read raw body for signature verification
  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (e) {
    return res.status(413).json({ error: 'Payload too large' });
  }
  const signature = req.headers['x-signature'] || '';

  if (!verifySignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const eventName = event?.meta?.event_name;
  const attrs     = event?.data?.attributes || {};
  const email     = attrs?.user_email || attrs?.customer_email || '';
  const subId     = String(event?.data?.id || '');

  const subData = {
    subscriptionId: subId,
    variantId:      String(attrs?.variant_id || ''),
    customerId:     String(attrs?.customer_id || ''),
    status:         attrs?.status || '',
    renewsAt:       attrs?.renews_at || null,
    endsAt:         attrs?.ends_at   || null,
  };

  if (!email) return res.status(200).json({ received: true, skipped: 'no email' });

  const user = await getUserByEmail(email);
  if (!user) return res.status(200).json({ received: true, skipped: 'user not found' });

  // ── Handle events ──
  switch (eventName) {
    // Subscription created or resumed — grant Pro
    case 'subscription_created':
    case 'subscription_resumed':
      await setProStatus(user.auth_id, true, subData);
      break;

    // Subscription updated (plan change, renewal etc.) — keep Pro, update metadata
    case 'subscription_updated':
      if (['active', 'past_due'].includes(attrs?.status)) {
        await setProStatus(user.auth_id, true, subData);
      }
      break;

    // Payment success — ensure Pro is active
    case 'subscription_payment_success':
      await setProStatus(user.auth_id, true, subData);
      break;

    // Subscription cancelled, expired, or payment failed — revoke Pro
    case 'subscription_cancelled':
    case 'subscription_expired':
    case 'subscription_payment_failed':
    case 'subscription_payment_recovered': // payment recovered = re-grant
      if (eventName === 'subscription_payment_recovered') {
        await setProStatus(user.auth_id, true, subData);
      } else if (eventName === 'subscription_cancelled') {
        // Cancelled but not yet expired — keep Pro until period ends
        await setProStatus(user.auth_id, true, { ...subData, status: 'cancelled' });
      } else {
        await setProStatus(user.auth_id, false, subData);
      }
      break;

    default:
      // Unknown event — just acknowledge
      break;
  }

  return res.status(200).json({ received: true, event: eventName });
}
