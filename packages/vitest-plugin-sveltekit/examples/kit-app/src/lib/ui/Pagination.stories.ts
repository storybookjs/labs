import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import Pagination from './Pagination.svelte';

const meta = preview.meta({
  title: 'UI/Pagination',
  component: Pagination,
  parameters: { layout: 'padded' },
  args: { page: 3, pageCount: 5, href: (page: number) => `/posts?page=${page}` },
});

// Queried without the visibility check: below 36rem the page numbers give way to "Page 3 of 5".
const current = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[aria-current="page"]');

export const Default = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    await expect(current(canvasElement)).toHaveTextContent('3');
    await expect(current(canvasElement)).toHaveAttribute('href', '/posts?page=3');
    await expect(canvas.getByRole('link', { name: /Previous/ })).toHaveAttribute(
      'href',
      '/posts?page=2'
    );
    await expect(canvas.getByRole('link', { name: /Next/ })).toHaveAttribute(
      'href',
      '/posts?page=4'
    );
  },
});

export const FirstPage = meta.story({
  args: { page: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link', { name: /Previous/ })).not.toBeInTheDocument();
    // On the first page, Previous is plain text, not a link.
    await expect(canvas.queryByRole('link', { name: /Previous/ })).toBeNull();
  },
});

export const LastPage = meta.story({
  args: { page: 5 },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link', { name: /Next/ })).not.toBeInTheDocument();
  },
});

export const ManyPages = meta.story({
  args: { page: 10, pageCount: 20, label: 'Older posts' },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('navigation', { name: 'Older posts' })).toBeInTheDocument();
    await expect(current(canvasElement)).toHaveTextContent('10');
    const pages = [...canvasElement.querySelectorAll('.pages li')].map((item) =>
      item.textContent?.trim()
    );
    await expect(pages).toEqual(['1', '…', '9', '10', '11', '…', '20']);
  },
});

export const SinglePage = meta.story({
  args: { page: 1, pageCount: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('navigation')).not.toBeInTheDocument();
  },
});

export const Mobile = meta.story({
  args: { page: 4, pageCount: 12 },
  globals: { viewport: { value: 'mobile1' } },
});

export const Dark = meta.story({
  args: { page: 4, pageCount: 12 },
  globals: { theme: 'dark' },
});
