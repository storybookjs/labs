// The public deploy on Netlify sets `DEMO_PASSWORD`. Then only the demo user, signed in with that
// password, can write posts, and the session cookie is signed, so nobody can write one by hand.
// Without `DEMO_PASSWORD` (local dev, stories and tests), anyone can write, as before.
import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';

import { DEMO_PASSWORD } from '$app/env/private';

/** The one user that can sign in on the public deploy. */
export const DEMO_USER = 'demo';

/** Whether the app runs as the public deploy. */
export const isPublicDemo = Boolean(DEMO_PASSWORD);

/**
 * Stops a write that stores or changes content when the public deploy has nobody signed in.
 * Call it before the handler's first `await`.
 */
export function requireSignIn(action: string): void {
  if (isPublicDemo && !getRequestEvent().locals.user) error(403, `Sign in to ${action}`);
}

/** The `session` cookie for `name`: the name, and on the public deploy also its signature. */
export async function sessionCookie(name: string): Promise<string> {
  return isPublicDemo ? `${name}.${await sign(name)}` : name;
}

/** The user a `session` cookie names, or `null` when its signature is wrong. */
export async function sessionUser(cookie: string): Promise<string | null> {
  if (!isPublicDemo) return cookie;
  const dot = cookie.lastIndexOf('.');
  const name = cookie.slice(0, dot);
  return dot > 0 && cookie.slice(dot + 1) === (await sign(name)) ? name : null;
}

/** An HMAC of `name`, keyed with the demo password. */
async function sign(name: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(DEMO_PASSWORD),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(name));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}
