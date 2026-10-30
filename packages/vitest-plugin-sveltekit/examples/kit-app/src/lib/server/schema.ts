import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
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

/** The schema as SQL, for a fresh PGlite database. A real app would use migrations. */
export const createTables = `
  CREATE TABLE IF NOT EXISTS posts (
    id serial PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS post_stats (
    post_id integer PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    views integer NOT NULL DEFAULT 0,
    likes integer NOT NULL DEFAULT 0
  );
`;
