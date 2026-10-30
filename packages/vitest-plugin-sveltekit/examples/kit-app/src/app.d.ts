// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    interface Locals {
      user?: { name: string } | null;
    }
  }
}

export {};
