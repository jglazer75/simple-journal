import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const SESSION_COOKIE = "sj_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return encoder.encode(secret);
}

function mutableCookies() {
  return cookies() as unknown as ReadonlyRequestCookies & {
    set: ReadonlyRequestCookies["set"];
    delete: ReadonlyRequestCookies["delete"];
  };
}

export async function setSessionCookie(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  mutableCookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function clearSessionCookie() {
  mutableCookies().delete(SESSION_COOKIE);
}
