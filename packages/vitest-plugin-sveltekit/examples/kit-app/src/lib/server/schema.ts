import { sql } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  author: text('author').notNull().default('Field Notes'),
  tags: text('tags')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  published: boolean('published').notNull().default(true),
  /** When the post was last published; `null` for a draft. The "new posts" banner counts these. */
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const postStats = pgTable('post_stats', {
  postId: integer('post_id')
    .primaryKey()
    .references(() => posts.id, { onDelete: 'cascade' }),
  views: integer('views').notNull().default(0),
  likes: integer('likes').notNull().default(0),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostStats = Pick<typeof postStats.$inferSelect, 'views' | 'likes'>;

/**
 * The schema as SQL, for a fresh PGlite database. A real app would use migrations; the
 * `ADD COLUMN IF NOT EXISTS` lines bring a database from an earlier version of the example up to
 * date.
 */
export const createTables = `
  CREATE TABLE IF NOT EXISTS posts (
    id serial PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL DEFAULT ''
  );
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text NOT NULL DEFAULT 'Field Notes';
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at timestamptz;
  UPDATE posts SET published_at = created_at WHERE published AND published_at IS NULL;
  CREATE TABLE IF NOT EXISTS post_stats (
    post_id integer PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    views integer NOT NULL DEFAULT 0,
    likes integer NOT NULL DEFAULT 0
  );
`;
