// Single-password auth: the password is exchanged for a signed, expiring token.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so both buffers have equal length.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string, expected: string): boolean {
  return expected.length > 0 && safeEqual(input, expected);
}

export function createToken(secret: string, now = Date.now()): string {
  const payload = String(now + TOKEN_TTL_MS);
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyToken(token: string, secret: string, now = Date.now()): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !secret) return false;
  if (!safeEqual(signature, sign(payload, secret))) return false;
  return Number(payload) > now;
}
