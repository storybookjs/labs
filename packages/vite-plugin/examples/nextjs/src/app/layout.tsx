import type { Metadata } from 'next';
import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

import { Counter } from '../components/Counter';

import './globals.css';

export const metadata: Metadata = {
  title: 'Next.js + Storybook workbench',
  description: 'A real Next.js app and Vite-powered Storybook, sharing one development server.',
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="site-header">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                N
              </span>
              Next workbench
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/">Home</Link>
              <Link href="/about">About</Link>
              {process.env.NODE_ENV === 'development' && (
                <a className="storybook-link" href="/__storybook/">
                  Open Storybook ↗
                </a>
              )}
            </nav>
          </header>
          <main className="workspace">
            <div className="page-content">{children}</div>
            <Counter />
          </main>
          <footer>Next.js owns the app. Storybook owns the preview.</footer>
        </div>
      </body>
    </html>
  );
}
