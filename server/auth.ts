import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

export type AuthRole = 'admin' | 'kasir';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: AuthRole;
  avatarColor?: string;
  isActive: boolean;
  createdAt: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

const SESSION_COOKIE = 'haypop_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function hashPin(pin: string, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(pin, salt, 32, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString('hex');
  return `scrypt$131072$8$1$${salt}$${hash}`;
}

function verifyPin(pin: string, encoded: string) {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(pin, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 256 * 1024 * 1024,
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function toAuthUser(row: any): AuthUser {
  return {
    id: String(row.id),
    name: String(row.name),
    username: String(row.username),
    role: row.role === 'admin' ? 'admin' : 'kasir',
    avatarColor: row.avatar_color || undefined,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at || ''),
  };
}

function parseCookies(header: string | undefined) {
  const cookies: Record<string, string> = {};
  for (const part of (header || '').split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function getSessionToken(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE] || null;
}

function isLoginBlocked(key: string) {
  const state = loginAttempts.get(key);
  if (!state) return false;
  if (Date.now() >= state.resetAt) {
    loginAttempts.delete(key);
    return false;
  }
  return state.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(key: string) {
  const now = Date.now();
  const state = loginAttempts.get(key);
  if (!state || now >= state.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOCKOUT_MS });
  } else {
    state.count += 1;
  }
}

function clearFailedLogin(key: string) {
  loginAttempts.delete(key);
}

export function authenticateUser(username: string, pin: string, ip: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const key = `${ip}:${normalizedUsername}`;
  if (isLoginBlocked(key)) {
    return { ok: false as const, status: 429, message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit.' };
  }

  const row = db.prepare(
    'SELECT id, name, username, pin, pin_hash, role, avatar_color, is_active, created_at FROM users WHERE username = ?'
  ).get(normalizedUsername) as any;

  let valid = Boolean(row && row.is_active && row.pin_hash && verifyPin(pin, row.pin_hash));

  // One-time compatibility migration for databases created before authentication hardening.
  if (row && row.is_active && !row.pin_hash && row.pin) {
    valid = verifyPin(pin, hashPin(row.pin));
    if (valid) {
      db.prepare('UPDATE users SET pin_hash = ?, pin = ? WHERE id = ?').run(hashPin(pin), '', row.id);
    }
  }

  if (!valid) {
    recordFailedLogin(key);
    return { ok: false as const, status: 401, message: 'Username atau PIN tidak valid.' };
  }

  clearFailedLogin(key);
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    hashSessionToken(token),
    row.id,
    expiresAt,
    new Date().toISOString()
  );

  return { ok: true as const, token, user: toAuthUser(row), expiresAt };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const row = db.prepare(
    `SELECT u.id, u.name, u.username, u.role, u.avatar_color, u.is_active, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  ).get(hashSessionToken(token), new Date().toISOString()) as any;

  if (!row || !row.is_active) {
    return res.status(401).json({ error: 'Session tidak valid atau sudah kedaluwarsa' });
  }

  req.auth = toAuthUser(row);
  next();
}

export function requireRole(role: AuthRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
    if (req.auth.role !== role) return res.status(403).json({ error: 'Akses ditolak' });
    next();
  };
}

export function setSessionCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production';
  const maxAge = SESSION_TTL_MS;
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.floor(maxAge / 1000)}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`
  );
}

export function clearSession(req: Request, res: Response) {
  const token = getSessionToken(req);
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(token));
  }
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

export function cleanupExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
}

export function hashUserPin(pin: string) {
  return hashPin(pin);
}
