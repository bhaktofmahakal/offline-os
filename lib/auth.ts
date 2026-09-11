export const SESSION_COOKIE_NAME = 'offline_admin_session';

const DEFAULT_SECRET = 'c2e8a1f87b9248d0a4b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3';
export const MASTER_EMAIL = (process.env.ADMIN_AUTH_EMAIL || 'utsavmishraa005@gmail.com').trim().toLowerCase();
export const MASTER_PASSWORD = (process.env.ADMIN_AUTH_PASSWORD || 'rudraraj@9721').trim();

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  return await crypto.subtle.importKey(
    'raw',
    enc as any,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(email: string): Promise<string> {
  const secret = (process.env.ADMIN_SESSION_SECRET || DEFAULT_SECRET).trim();
  const payload = JSON.stringify({
    email: email.toLowerCase(),
    role: 'super_admin',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  const payloadEncoded = new TextEncoder().encode(payload);
  const payloadBase64 = uint8ArrayToBase64Url(payloadEncoded);
  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadBase64) as any
  );
  const signatureBase64 = uint8ArrayToBase64Url(new Uint8Array(signatureBuffer));

  return `${payloadBase64}.${signatureBase64}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<{ valid: boolean; email?: string }> {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false };
  }

  const [payloadBase64, signatureBase64] = token.split('.');
  if (!payloadBase64 || !signatureBase64) {
    return { valid: false };
  }

  try {
    const secret = (process.env.ADMIN_SESSION_SECRET || DEFAULT_SECRET).trim();
    const key = await getCryptoKey(secret);
    const signatureBytes = base64UrlToBuffer(signatureBase64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as any,
      new TextEncoder().encode(payloadBase64) as any
    );

    if (!isValid) {
      return { valid: false };
    }

    const payloadJson = new TextDecoder().decode(base64UrlToBuffer(payloadBase64));
    const payload = JSON.parse(payloadJson);

    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return { valid: false };
    }

    if (!payload.email || payload.email.toLowerCase() !== MASTER_EMAIL) {
      return { valid: false };
    }

    return { valid: true, email: payload.email };
  } catch (err) {
    return { valid: false };
  }
}

export function validateMasterCredentials(email: string, pass: string): boolean {
  if (!email || !pass) return false;
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  return cleanEmail === MASTER_EMAIL && cleanPass === MASTER_PASSWORD;
}
