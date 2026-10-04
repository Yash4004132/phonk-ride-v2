const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const RECEIVER_WALLET = 'ByeKyrRYoUkj2RJx8KXhizVhiYfuuCyFZvSx3foxqwd5';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const USDT_DECIMALS = 6;
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const ORDER_TTL_MS = 20 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_ATTEMPT_LIMIT = 10;
const DB_PATH = path.join(ROOT, 'phonk-ride.sqlite');
const PACKS = new Map([
  ['basic', { inrCredits: 200, usdCredits: 250, usd: 5 }],
  ['standard', { inrCredits: 400, usdCredits: 500, usd: 10 }],
  ['premium', { inrCredits: 600, usdCredits: 750, usd: 20 }],
]);
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    callsign TEXT NOT NULL,
    phone TEXT,
    balance INTEGER NOT NULL DEFAULT 200,
    streak INTEGER NOT NULL DEFAULT 0,
    runs INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS payment_orders (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    credits INTEGER NOT NULL,
    currency TEXT NOT NULL,
    usd REAL NOT NULL,
    usdt_amount REAL NOT NULL,
    rate REAL NOT NULL,
    wallet TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    signature TEXT
  );
  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    credits INTEGER NOT NULL,
    wallet TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS payment_signature_unique
    ON payment_orders(signature) WHERE signature IS NOT NULL;
`);

for (const column of [
  'phone TEXT',
  'streak INTEGER NOT NULL DEFAULT 0',
  'rider_id TEXT',
  'password_salt TEXT',
  'password_hash TEXT',
]) {
  try { db.exec(`ALTER TABLE profiles ADD COLUMN ${column}`); } catch { /* Existing installs already have this column. */ }
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS profiles_rider_id_unique ON profiles(rider_id) WHERE rider_id IS NOT NULL');
const sessions = new Map();
const authAttempts = new Map();

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
};
const PUBLIC_FILES = new Set([
  'index.html',
  'styles.css',
  'app.js',
  'payout-estimate.js',
  'indian-qr.jpeg',
  'wallet-qr.jpeg',
]);

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let tooLarge = false;
    request.on('data', (chunk) => {
      if (tooLarge) return;
      raw += chunk;
      if (Buffer.byteLength(raw) > 12_000) {
        tooLarge = true;
        const error = new Error('request too large');
        error.statusCode = 413;
        reject(error);
      }
    });
    request.on('end', () => {
      if (tooLarge) return;
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid json')); }
    });
    request.on('error', reject);
  });
}

async function rpc(method, params) {
  const response = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`Solana RPC ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || 'Solana RPC error');
  return payload.result;
}

async function getUsdtUsdRate() {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd', { cache: 'no-store' });
  if (!response.ok) throw new Error(`rate service ${response.status}`);
  const payload = await response.json();
  const rate = Number(payload?.tether?.usd);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('invalid USDT rate');
  return rate;
}

function getUsdtAmount(usd, rate) {
  return Number((usd / rate).toFixed(USDT_DECIMALS));
}

function sanitizeCallsign(value) {
  return String(value || 'NIGHT RIDER').trim().replace(/\s+/g, ' ').slice(0, 18).toUpperCase() || 'NIGHT RIDER';
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  const phone = raw.replace(/[^0-9+]/g, '');
  if (!/^\+[1-9][0-9]{6,14}$/.test(phone)) return null;
  return phone;
}

function normalizeRiderId(value) {
  const riderId = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(riderId) ? riderId : null;
}

function normalizeSolanaWallet(value) {
  const wallet = String(value || '').trim();
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet) ? wallet : null;
}

function normalizeUpiId(value) {
  const upi = String(value || '').trim();
  return /^[A-Za-z0-9._-]{3,50}@[A-Za-z0-9.-]{2,32}$/.test(upi) ? upi : null;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function passwordMatches(profile, password) {
  if (!profile?.password_hash || !profile?.password_salt) return false;
  const actual = Buffer.from(hashPassword(password, profile.password_salt).hash, 'hex');
  const expected = Buffer.from(profile.password_hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
  }));
}

function sessionCookie(token, maxAge = SESSION_TTL_MS / 1000) {
  return `phonk_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}

function startSession(profile) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { profileId: profile.id, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSessionProfile(request) {
  const token = parseCookies(request).phonk_session;
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return getProfile(session.profileId);
}

function profileToJson(profile) {
  return {
    profileId: profile.id,
    riderId: profile.rider_id || null,
    name: profile.callsign || 'NIGHT RIDER',
    phone: profile.phone || profile.callsign || null,
    callsign: profile.callsign,
    balance: Number(profile.balance) || 0,
    streak: profile.streak,
    runs: profile.runs,
    wins: profile.wins,
    losses: profile.losses,
    bestStreak: profile.best_streak,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function getProfile(profileId) {
  return db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId);
}

function validateAuthInput(body, requireName = false) {
  const riderId = normalizeRiderId(body.riderId);
  const password = String(body.password || '');
  const rawName = String(body.name || '').trim();
  const name = sanitizeCallsign(rawName);
  const rawPhone = String(body.phone || '').trim();
  const phone = normalizePhone(rawPhone);
  if (!riderId) return { error: 'RIDER ID MUST BE 3-32 CHARACTERS // USE A-Z, 0-9, DOT, DASH OR UNDERSCORE' };
  if (password.length < 6 || password.length > 72) return { error: 'ACCESS CODE MUST BE 6-72 CHARACTERS' };
  if (requireName && rawName.length < 2) return { error: 'RIDER NAME REQUIRED // ENTER AT LEAST 2 CHARACTERS' };
  if (requireName && !phone) return { error: 'ENTER PHONE WITH COUNTRY CODE // EXAMPLE +91 98765 43210' };
  return { riderId, password, name, phone };
}

function registerAccount(body) {
  const input = validateAuthInput(body, true);
  if (input.error) return { status: 400, body: { ok: false, message: input.error } };
  const existingRider = db.prepare('SELECT id FROM profiles WHERE rider_id = ?').get(input.riderId);
  if (existingRider) return { status: 409, body: { ok: false, message: 'RIDER ID ALREADY EXISTS // SIGN IN INSTEAD' } };
  const password = hashPassword(input.password);
  const now = Date.now();
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO profiles (id, rider_id, password_salt, password_hash, callsign, phone, balance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 200, ?, ?)
  `).run(id, input.riderId, password.salt, password.hash, input.name, input.phone, now, now);
  const profile = db.prepare('SELECT * FROM profiles WHERE rider_id = ?').get(input.riderId);
  return { status: 201, body: { ok: true, profile: profileToJson(profile) }, token: startSession(profile) };
}

function loginAccount(body) {
  const input = validateAuthInput(body);
  if (input.error) return { status: 400, body: { ok: false, message: input.error } };
  const profile = db.prepare('SELECT * FROM profiles WHERE rider_id = ?').get(input.riderId);
  if (!profile || !passwordMatches(profile, input.password)) {
    return { status: 401, body: { ok: false, message: 'RIDER ID OR ACCESS CODE NOT RECOGNIZED' } };
  }
  return { status: 200, body: { ok: true, profile: profileToJson(profile) }, token: startSession(profile) };
}

function updateProfileDetails(profileId, body) {
  const now = Date.now();
  const name = sanitizeCallsign(body.name || body.callsign);
  const phone = normalizePhone(body.phone);
  if (name.length < 2) throw new Error('invalid rider name');
  if (!phone) throw new Error('invalid phone number');
  db.prepare('UPDATE profiles SET phone = ?, callsign = ?, updated_at = ? WHERE id = ?').run(phone, name, now, profileId);
  return getProfile(profileId);
}

function syncProfileStats(profileId, body) {
  const values = ['streak', 'runs', 'wins', 'losses', 'bestStreak'].map((key) => Number(body[key]));
  if (values.some((value) => !Number.isFinite(value) || value < 0 || !Number.isInteger(value))) throw new Error('invalid profile stats');
  const [streak, runs, wins, losses, bestStreak] = values;
  const now = Date.now();
  db.prepare(`
    UPDATE profiles
    SET streak = ?, runs = ?, wins = ?, losses = ?, best_streak = ?, updated_at = ?
    WHERE id = ?
  `).run(streak, runs, wins, losses, bestStreak, now, profileId);
  return getProfile(profileId);
}

function isAuthRateLimited(address) {
  const now = Date.now();
  const attempts = authAttempts.get(address);
  if (!attempts || now - attempts.startedAt >= AUTH_WINDOW_MS) {
    return false;
  }
  return attempts.count >= AUTH_ATTEMPT_LIMIT;
}

function recordAuthFailure(address) {
  const now = Date.now();
  const attempts = authAttempts.get(address);
  if (!attempts || now - attempts.startedAt >= AUTH_WINDOW_MS) {
    authAttempts.set(address, { startedAt: now, count: 1 });
    return;
  }
  attempts.count += 1;
}

function getReceivedUsdt(transaction) {
  const meta = transaction?.meta;
  if (!meta || meta.err) return 0n;
  const before = new Map();
  for (const balance of meta.preTokenBalances || []) {
    if (balance.mint === USDT_MINT && balance.owner === RECEIVER_WALLET) {
      before.set(balance.accountIndex, BigInt(balance.uiTokenAmount.amount));
    }
  }
  let received = 0n;
  for (const balance of meta.postTokenBalances || []) {
    if (balance.mint !== USDT_MINT || balance.owner !== RECEIVER_WALLET) continue;
    const after = BigInt(balance.uiTokenAmount.amount);
    const delta = after - (before.get(balance.accountIndex) || 0n);
    if (delta > 0n) received += delta;
  }
  return received;
}

async function createOrder(request, body) {
  const pack = PACKS.get(String(body.packId || ''));
  if (!pack) throw new Error('unsupported pack');
  const profile = getSessionProfile(request);
  const profileId = String(body.profileId || '').trim();
  if (!profile) throw new Error('login required');
  if (profileId !== profile.id) throw new Error('profile session mismatch');
  const currency = body.currency === 'USD' ? 'USD' : 'INR';
  const credits = currency === 'USD' ? pack.usdCredits : pack.inrCredits;
  const rate = await getUsdtUsdRate();
  const order = {
    id: crypto.randomUUID(),
    profileId,
    credits,
    currency,
    usd: pack.usd,
    usdtAmount: getUsdtAmount(pack.usd, rate),
    rate,
    wallet: RECEIVER_WALLET,
    createdAt: Date.now(),
    expiresAt: Date.now() + ORDER_TTL_MS,
    verified: false,
  };
  db.prepare(`
    INSERT INTO payment_orders
      (id, profile_id, credits, currency, usd, usdt_amount, rate, wallet, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(order.id, order.profileId, order.credits, order.currency, order.usd, order.usdtAmount, order.rate, order.wallet, order.createdAt, order.expiresAt);
  return order;
}

async function verifyOrder(request, body) {
  const order = db.prepare('SELECT * FROM payment_orders WHERE id = ?').get(String(body.orderId || ''));
  const signature = String(body.signature || '').trim();
  const sessionProfile = getSessionProfile(request);
  if (!sessionProfile) return { status: 401, body: { ok: false, message: 'LOGIN REQUIRED' } };
  if (!order) return { status: 404, body: { ok: false, message: 'PAYMENT ORDER NOT FOUND' } };
  if (order.profile_id !== sessionProfile.id) return { status: 403, body: { ok: false, message: 'PAYMENT ORDER SESSION MISMATCH' } };
  if (order.expires_at < Date.now()) return { status: 410, body: { ok: false, message: 'PAYMENT ORDER EXPIRED' } };
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,100}$/.test(signature)) {
    return { status: 400, body: { ok: false, message: 'ENTER A VALID SOLANA TRANSACTION SIGNATURE' } };
  }
  if (order.verified) {
    const profile = getProfile(order.profile_id);
    return { status: 200, body: { ok: true, verified: true, credits: order.credits, balance: profile?.balance ?? 0, message: 'PAYMENT ALREADY VERIFIED' } };
  }
  const usedOrder = db.prepare('SELECT id FROM payment_orders WHERE signature = ?').get(signature);
  if (usedOrder) return { status: 409, body: { ok: false, message: 'TRANSACTION ALREADY USED' } };

  const transaction = await rpc('getTransaction', [signature, {
    commitment: 'finalized',
    encoding: 'jsonParsed',
    maxSupportedTransactionVersion: 0,
  }]);
  if (!transaction) {
    return { status: 202, body: { ok: false, pending: true, message: 'TRANSACTION NOT FINALIZED YET' } };
  }

  const expectedAtomic = BigInt(Math.ceil(order.usdt_amount * 10 ** USDT_DECIMALS));
  const minimumAtomic = expectedAtomic * 995n / 1000n;
  const receivedAtomic = getReceivedUsdt(transaction);
  if (!Number.isSafeInteger(transaction.blockTime) || transaction.blockTime < Math.floor(order.created_at / 1000)) {
    return { status: 400, body: { ok: false, message: 'TRANSACTION MUST BE MADE AFTER THIS PAYMENT ORDER' } };
  }
  if (receivedAtomic < minimumAtomic) {
    return { status: 400, body: { ok: false, message: `INSUFFICIENT USDT // EXPECTED ${order.usdt_amount} USDT` } };
  }

  const verifiedAt = Date.now();
  db.exec('BEGIN IMMEDIATE');
  try {
    const currentOrder = db.prepare('SELECT * FROM payment_orders WHERE id = ?').get(order.id);
    if (currentOrder?.verified) {
      db.exec('COMMIT');
      const currentProfile = getProfile(order.profile_id);
      return { status: 200, body: { ok: true, verified: true, credits: currentOrder.credits, balance: currentProfile?.balance ?? 0, message: 'PAYMENT ALREADY VERIFIED' } };
    }
    if (!currentOrder || currentOrder.expires_at < verifiedAt) {
      db.exec('ROLLBACK');
      return { status: 410, body: { ok: false, message: 'PAYMENT ORDER EXPIRED' } };
    }
    if (db.prepare('SELECT id FROM payment_orders WHERE signature = ?').get(signature)) {
      db.exec('ROLLBACK');
      return { status: 409, body: { ok: false, message: 'TRANSACTION ALREADY USED' } };
    }
    db.prepare('UPDATE payment_orders SET verified = 1, signature = ? WHERE id = ? AND verified = 0').run(signature, order.id);
    db.prepare('UPDATE profiles SET balance = balance + ?, updated_at = ? WHERE id = ?').run(order.credits, verifiedAt, order.profile_id);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  const profile = getProfile(order.profile_id);
  return { status: 200, body: { ok: true, verified: true, credits: order.credits, balance: profile?.balance ?? 0, message: 'PAYMENT VERIFIED' } };
}

function createWithdrawalRequest(request, body) {
  const sessionProfile = getSessionProfile(request);
  if (!sessionProfile) return { status: 401, body: { ok: false, message: 'LOGIN REQUIRED // SIGN IN TO WITHDRAW CREDITS' } };
  const profileId = String(body.profileId || '').trim();
  if (profileId !== sessionProfile.id) return { status: 403, body: { ok: false, message: 'PROFILE SESSION MISMATCH' } };
  const credits = Number(body.credits);
  const payoutMethod = body.payoutMethod === 'foreign' ? 'foreign' : body.payoutMethod === 'indian' ? 'indian' : null;
  const wallet = payoutMethod === 'foreign' ? normalizeSolanaWallet(body.wallet) : payoutMethod === 'indian' ? normalizeUpiId(body.wallet) : null;
  if (!Number.isInteger(credits) || credits < 10000) return { status: 400, body: { ok: false, message: 'MINIMUM WITHDRAWAL // 10,000 CREDITS' } };
  if (!wallet) return { status: 400, body: { ok: false, message: 'ENTER A VALID WALLET OR UPI ID' } };
  const profile = getProfile(profileId);
  if (!profile) return { status: 404, body: { ok: false, message: 'PROFILE NOT FOUND' } };
  const id = crypto.randomUUID();
  db.exec('BEGIN IMMEDIATE');
  try {
    const debit = db.prepare('UPDATE profiles SET balance = balance - ?, updated_at = ? WHERE id = ? AND balance >= ?').run(credits, Date.now(), profileId, credits);
    if (!debit.changes) {
      db.exec('ROLLBACK');
      return { status: 400, body: { ok: false, message: 'INSUFFICIENT CREDITS // CHECK YOUR BALANCE' } };
    }
    db.prepare(`
      INSERT INTO withdrawal_requests (id, profile_id, credits, wallet, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(id, profileId, credits, wallet, Date.now());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  const updatedProfile = getProfile(profileId);
  return {
    status: 201,
    body: {
      ok: true,
      requestId: id,
      status: 'pending',
      credits,
      balance: updatedProfile.balance,
      message: 'WITHDRAWAL REQUEST RECEIVED // MANUAL REVIEW REQUIRED',
    },
  };
}

function serveFile(request, response, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(ROOT, `.${requested}`);
  const relativePath = path.relative(ROOT, filePath);
  if (!PUBLIC_FILES.has(relativePath) || relativePath.startsWith('..') || path.isAbsolute(relativePath) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404); response.end('not found'); return;
  }
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.coingecko.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const origin = request.headers.origin;
    if (origin && new URL(origin).host !== request.headers.host) {
      sendJson(response, 403, { ok: false, message: 'CROSS-ORIGIN REQUEST BLOCKED' });
      return;
    }
    if (request.method === 'POST' && /^\/api\/auth\/(register|login)$/.test(url.pathname)) {
      const address = request.socket.remoteAddress || 'unknown';
      if (isAuthRateLimited(address)) {
        sendJson(response, 429, { ok: false, message: 'TOO MANY LOGIN ATTEMPTS // TRY AGAIN LATER' }, { 'Retry-After': String(AUTH_WINDOW_MS / 1000) });
        return;
      }
      const body = await readJson(request);
      const result = url.pathname.endsWith('/register') ? registerAccount(body) : loginAccount(body);
      if (result.status >= 400) recordAuthFailure(address);
      else authAttempts.delete(address);
      sendJson(response, result.status, result.body, result.token ? { 'Set-Cookie': sessionCookie(result.token) } : {});
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { ok: true, network: 'solana-mainnet', asset: 'USDT-SPL', storage: 'sqlite' });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/auth/me') {
      const profile = getSessionProfile(request);
      if (!profile) { sendJson(response, 401, { ok: false, message: 'LOGIN REQUIRED' }); return; }
      sendJson(response, 200, { ok: true, profile: profileToJson(profile) });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = parseCookies(request).phonk_session;
      if (token) sessions.delete(token);
      sendJson(response, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
      return;
    }
    const profileMatch = url.pathname.match(/^\/api\/profile\/([^/]+)(?:\/(sync))?$/);
    if (profileMatch) {
      const profileId = decodeURIComponent(profileMatch[1]);
      const sessionProfile = getSessionProfile(request);
      if (!sessionProfile) { sendJson(response, 401, { ok: false, message: 'LOGIN REQUIRED' }); return; }
      if (profileId !== sessionProfile.id) { sendJson(response, 403, { ok: false, message: 'PROFILE SESSION MISMATCH' }); return; }
      if (request.method === 'GET') {
        const profile = getProfile(profileId);
        if (!profile) { sendJson(response, 404, { ok: false, message: 'PROFILE NOT FOUND' }); return; }
        sendJson(response, 200, { ok: true, profile: profileToJson(profile) });
        return;
      }
      if (request.method === 'PATCH' && !profileMatch[2]) {
        const profile = getProfile(profileId);
        if (!profile) { sendJson(response, 404, { ok: false, message: 'PROFILE NOT FOUND' }); return; }
        const body = await readJson(request);
        sendJson(response, 200, { ok: true, profile: profileToJson(updateProfileDetails(profileId, body)) });
        return;
      }
      if (request.method === 'POST' && profileMatch[2] === 'sync') {
        const profile = getProfile(profileId);
        if (!profile) { sendJson(response, 404, { ok: false, message: 'PROFILE NOT FOUND' }); return; }
        sendJson(response, 200, { ok: true, profile: profileToJson(syncProfileStats(profileId, await readJson(request))) });
        return;
      }
    }
    if (request.method === 'POST' && url.pathname === '/api/payment/order') {
      if (!getSessionProfile(request)) { sendJson(response, 401, { ok: false, message: 'LOGIN REQUIRED' }); return; }
      const body = await readJson(request);
      const order = await createOrder(request, body);
      sendJson(response, 200, { ok: true, orderId: order.id, credits: order.credits, currency: order.currency, usd: order.usd, usdtAmount: order.usdtAmount, rate: order.rate, wallet: order.wallet, expiresAt: order.expiresAt });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/payment/verify') {
      const result = await verifyOrder(request, await readJson(request));
      sendJson(response, result.status, result.body);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/withdrawal') {
      const result = createWithdrawalRequest(request, await readJson(request));
      sendJson(response, result.status, result.body);
      return;
    }
    if (request.method === 'GET') serveFile(request, response, url.pathname);
    else sendJson(response, 405, { ok: false, message: 'method not allowed' });
  } catch (error) {
    const status = error.statusCode === 413 ? 413 : 500;
    sendJson(response, status, { ok: false, message: 'REQUEST FAILED // TRY AGAIN LATER' });
  }
});

server.listen(PORT, () => console.log(`PHONK RIDE server: http://127.0.0.1:${PORT}`));
