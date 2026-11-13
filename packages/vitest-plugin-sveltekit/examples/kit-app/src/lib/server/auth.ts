import { DEMO_PASSWORD } from '$app/env/private';

import { DEMO_USER } from './public-demo.ts';

/**
 * Checks a password. A real app would compare a stored hash. The public deploy accepts only the
 * demo user with `DEMO_PASSWORD`.
 */
export async function checkPassword(name: string, password: string): Promise<boolean> {
  if (DEMO_PASSWORD) return name === DEMO_USER && password === DEMO_PASSWORD;
  return password === `${name}-secret`;
}
