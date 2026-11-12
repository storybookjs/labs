// What the blog's remote functions, components and pages share. Safe to import in the browser.
import * as v from 'valibot';

import { excerpt } from './markdown.ts';

export const PAGE_SIZE = 6;

export const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
] as const;

export const statusOptions = [
  { value: 'published', label: 'Published' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'all', label: 'All posts' },
] as const;

export type Sort = (typeof sortOptions)[number]['value'];
export type Status = (typeof statusOptions)[number]['value'];

/** The filters of the post list. The home page keeps them in the URL. */
export const listParamsSchema = v.object({
  q: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100)), ''),
  tag: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(24)), ''),
  sort: v.optional(v.picklist(sortOptions.map((option) => option.value)), 'newest'),
  status: v.optional(v.picklist(statusOptions.map((option) => option.value)), 'published'),
  page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
});

export type ListParams = v.InferOutput<typeof listParamsSchema>;

export const defaultListParams: ListParams = v.parse(listParamsSchema, {});

/** The list parameters in a URL's search params; unknown or invalid values fall back. */
export function parseListParams(search: Pick<URLSearchParams, 'get'>): ListParams {
  const page = Number(search.get('page') ?? 1);
  const raw = {
    q: search.get('q') ?? undefined,
    tag: search.get('tag') ?? undefined,
    sort: search.get('sort') ?? undefined,
    status: search.get('status') ?? undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
  const result = v.safeParse(listParamsSchema, raw);
  return result.success ? result.output : defaultListParams;
}

/** The home page URL for `params`, without the defaults. */
export function listHref(params: Partial<ListParams>): string {
  const search = new URLSearchParams();
  const merged = { ...defaultListParams, ...params };
  for (const key of ['q', 'tag', 'sort', 'status', 'page'] as const) {
    const value = merged[key];
    if (value !== defaultListParams[key] && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `/?${query}` : '/';
}

export interface PostSummary {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  tags: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  readingMinutes: number;
}

export interface PostDetail extends PostSummary {
  body: string;
}

/** A row of the `posts` table, as far as the blog reads it. */
export interface PostRow {
  id: number;
  title: string;
  body: string;
  author: string;
  tags: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** What a card shows of a post. */
export function toSummary(post: PostRow): PostSummary {
  return {
    id: post.id,
    title: post.title,
    excerpt: excerpt(post.body),
    author: post.author,
    tags: post.tags,
    published: post.published,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    readingMinutes: readingMinutes(post.body),
  };
}

export interface TagCount {
  name: string;
  count: number;
}

export interface PostPage {
  posts: PostSummary[];
  total: number;
  page: number;
  pageCount: number;
  /** When the newest post was published (ms since 1970, 0 for none), for the "new posts" banner. */
  lastPublishedAt: number;
  tags: TagCount[];
}

export interface ReadingStats {
  views: number;
  likes: number;
}

const TAG = /^[a-z0-9][a-z0-9-]{0,23}$/;

/** The fields of the new post and edit post forms. Tags are comma-separated. */
export const postFields = {
  title: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Give the post a title'),
    // Valibot runs the whole pipe: an empty title gets only the issue above.
    v.check((title) => title.length === 0 || title.length >= 3, 'Use at least 3 characters'),
    v.maxLength(120, 'Keep the title under 120 characters')
  ),
  body: v.pipe(v.string(), v.trim(), v.nonEmpty('Write something first')),
  tags: v.pipe(
    v.optional(v.string(), ''),
    v.transform(parseTags),
    v.maxLength(5, 'Use at most 5 tags'),
    v.check(
      (tags) => tags.every((tag) => TAG.test(tag)),
      'Tags use lowercase letters, digits and dashes (up to 24 characters)'
    )
  ),
  author: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Say who wrote this'),
    v.maxLength(60, 'Keep the name under 60 characters')
  ),
  published: v.optional(v.boolean(), false),
};

export function parseTags(value: string): string[] {
  const tags = value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

/** At 220 words a minute, at least one minute. */
export function readingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

const plurals = new Intl.PluralRules('en');
const compact = new Intl.NumberFormat('en', { notation: 'compact' });

/** "1 view", "2 views", "1.3K views". */
export function countOf(count: number, one: string, other = `${one}s`): string {
  return `${compact.format(count)} ${plurals.select(count) === 'one' ? one : other}`;
}

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

/** "3 days ago", "yesterday", "in 2 hours"; dates older than a month get their date. */
export function formatRelative(date: Date, now = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
  ];
  let value = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return relativeFormat.format(value, unit);
    value = Math.round(value / size);
  }
  return formatDate(date);
}
