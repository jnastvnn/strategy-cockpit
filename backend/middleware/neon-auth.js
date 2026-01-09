import { createLocalJWKSet, jwtVerify } from 'jose';

const resolveNeonAuthBaseUrl = () =>
  process.env.NEON_AUTH_BASE_URL ||
  process.env.NEON_AUTH_URL ||
  process.env.VITE_NEON_AUTH_URL ||
  '';

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

let cachedJwks = null;
let cachedJwksExpiresAt = 0;
let cachedJwksUrl = '';

const resolveJwksUrls = () => {
  if (process.env.NEON_AUTH_JWKS_URL) {
    return [process.env.NEON_AUTH_JWKS_URL];
  }

  const baseUrl = resolveNeonAuthBaseUrl();
  if (!baseUrl) return [];

  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return [
    new URL('jwt', base).toString(),
    new URL('jwt/', base).toString(),
    new URL('.well-known/jwks.json', base).toString(),
  ];
};

const shortBodyPreview = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

const fetchJwks = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'cruxlens-backend',
    },
  });

  const text = await response.text().catch(() => '');
  if (!response.ok) {
    throw new Error(
      `JWKS request failed (${response.status} ${response.statusText}) from ${url}${text ? `: ${shortBodyPreview(text)}` : ''}`
    );
  }

  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_error) {
    throw new Error(
      `JWKS response was not valid JSON from ${url}${text ? `: ${shortBodyPreview(text)}` : ''}`
    );
  }

  if (!json || !Array.isArray(json.keys)) {
    throw new Error(
      `JWKS response is missing "keys" array from ${url}${text ? `: ${shortBodyPreview(text)}` : ''}`
    );
  }

  return json;
};

const getJwks = async ({ forceRefresh = false } = {}) => {
  const urls = resolveJwksUrls();
  if (!urls.length) {
    return null;
  }

  const now = Date.now();
  if (!forceRefresh && cachedJwks && now < cachedJwksExpiresAt) {
    return cachedJwks;
  }

  let lastError = null;
  for (const url of urls) {
    try {
      const jwks = await fetchJwks(url);
      cachedJwks = jwks;
      cachedJwksExpiresAt = Date.now() + JWKS_CACHE_TTL_MS;
      cachedJwksUrl = url;
      return jwks;
    } catch (error) {
      lastError = error;
    }
  }

  const details = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Unable to fetch Neon JWKS. Last error: ${details}`);
};

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  if (typeof header !== 'string') {
    return null;
  }

  const trimmed = header.trim();
  if (!trimmed) {
    return null;
  }

  const [scheme, token] = trimmed.split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

const extractAuthUserId = (payload) => {
  const sub = payload?.sub;
  if (typeof sub === 'string' && sub.trim()) {
    return sub.trim();
  }
  return null;
};

export const verifyNeonJwt = async (token) => {
  const jwks = await getJwks();
  if (!jwks) {
    throw new Error(
      'NEON_AUTH_BASE_URL is not set (needed to fetch JWKS and verify tokens)'
    );
  }

  const localJwks = createLocalJWKSet(jwks);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, localJwks));
  } catch (error) {
    // If keys rotated, refresh JWKS once and retry.
    const refreshed = await getJwks({ forceRefresh: true });
    if (refreshed) {
      const refreshedLocal = createLocalJWKSet(refreshed);
      ({ payload } = await jwtVerify(token, refreshedLocal));
    } else {
      throw error;
    }
  }

  const authUserId = extractAuthUserId(payload);
  if (!authUserId) {
    throw new Error('Neon JWT is missing a usable "sub" claim');
  }

  return { authUserId, payload, jwksUrl: cachedJwksUrl };
};

export const requireNeonAuth = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization bearer token' });
    }

    const { authUserId } = await verifyNeonJwt(token);
    req.authUserId = authUserId;
    return next();
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEON_AUTH_BASE_URL')) {
      console.error('Neon auth is not configured:', error.message);
      return res.status(500).json({ error: 'Server auth is not configured' });
    }

    if (error instanceof Error && error.message.toLowerCase().includes('jwks')) {
      console.error('Neon auth JWKS fetch failed:', error.message);
      return res.status(502).json({ error: 'Unable to verify auth token' });
    }

    const message = error instanceof Error ? error.message : 'Unauthorized';
    console.error('Neon auth verification failed:', message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
