/** Checks a password. A real app would compare a stored hash. */
export async function checkPassword(name: string, password: string): Promise<boolean> {
  return password === `${name}-secret`;
}
