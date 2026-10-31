import type { NewPost } from './schema.ts';

export type SeedPost = NewPost & { views?: number; likes?: number };

/** The rows of the `posts` table for `posts`: not edited yet, published when they were written. */
export function postRows(posts: SeedPost[]): NewPost[] {
  return posts.map(
    ({ title, body, author, tags, published, createdAt, updatedAt, publishedAt }) => ({
      title,
      body,
      author,
      tags,
      published,
      createdAt,
      updatedAt: updatedAt ?? createdAt,
      publishedAt: publishedAt ?? (published === false ? null : (createdAt ?? new Date())),
    })
  );
}

/** The rows of the `post_stats` table, for the ids the posts were inserted with. */
export function statsRows(ids: number[], posts: SeedPost[]) {
  return ids.map((postId, index) => ({
    postId,
    views: posts[index]?.views ?? 0,
    likes: posts[index]?.likes ?? 0,
  }));
}

const day = (date: string) => new Date(`${date}T09:30:00Z`);

/** The posts a new database starts with (`pnpm dev` and `pnpm preview` seed them on first run). */
export const seedPosts: SeedPost[] = [
  {
    title: 'Writing a field guide for your own codebase',
    author: 'Ada Okafor',
    tags: ['writing', 'notes'],
    createdAt: day('2026-06-02'),
    views: 412,
    likes: 38,
    body: `Every team has a codebase that only two people really understand. A field guide changes that: a short, opinionated document that tells a newcomer **where to look first**.

## What goes in

- The three directories that matter, and the twenty that do not.
- How a request travels from the browser to the database.
- The words the team uses, with one sentence each.

## What stays out

Anything the code already says. If a guide repeats the code, it goes stale the week after it is written.

> Write the guide you wished you had on your first day.`,
  },
  {
    title: 'Remote functions, one month in',
    author: 'Lin Chen',
    tags: ['svelte', 'notes'],
    createdAt: day('2026-06-18'),
    views: 1280,
    likes: 96,
    body: `We moved our dashboard from \`load\` functions to SvelteKit's remote functions. The short version: fewer files, typed calls, and forms that validate on both sides.

\`\`\`ts
export const getPosts = query(v.picklist(['newest', 'oldest']), (order) =>
  db.select().from(posts).orderBy(order === 'newest' ? desc(posts.id) : asc(posts.id))
);
\`\`\`

The part we did not expect to like: \`query.live\`. A live count in the header took eight lines.`,
  },
  {
    title: 'A calmer colour palette',
    author: 'Sanna Virtanen',
    tags: ['design'],
    createdAt: day('2026-07-03'),
    views: 655,
    likes: 71,
    body: `Our old palette had eleven blues. The new one has one accent, two greys for text, and a surface colour that works in both themes.

1. Start from the text colour, not the brand colour.
2. Check contrast in **both** themes before anything else.
3. Give danger and success one shade each.

Fewer colours made every screen easier to read.`,
  },
  {
    title: 'Testing components against the real handlers',
    author: 'Lin Chen',
    tags: ['testing', 'svelte'],
    createdAt: day('2026-07-21'),
    views: 903,
    likes: 64,
    body: `Mocks are quick, but they drift. Running the real remote functions in the browser, against an in-memory database, keeps a story honest: the schema runs, \`invalid()\` runs, the redirect runs.

Seed the database in \`beforeEach\`, and each story starts from the same rows.`,
  },
  {
    title: 'Small tools I reach for every day',
    author: 'Mateo Ruiz',
    tags: ['tooling'],
    createdAt: day('2026-08-04'),
    views: 377,
    likes: 22,
    body: `- A scratch folder per day, deleted on Friday.
- A shell alias that opens the last failing test.
- A notes file per project, in the repository, written for the next person.

None of them are clever. All of them save a few minutes, many times a day.`,
  },
  {
    title: 'How we review pull requests',
    author: 'Ada Okafor',
    tags: ['notes', 'writing'],
    createdAt: day('2026-08-19'),
    views: 540,
    likes: 45,
    body: `A review answers two questions: **does it work**, and **will we understand it in a year**.

We read the description first, the tests second, the code third. If the description cannot say what changed in three sentences, the change is probably too big.`,
  },
  {
    title: 'Typography for long reads',
    author: 'Sanna Virtanen',
    tags: ['design', 'writing'],
    createdAt: day('2026-09-02'),
    views: 721,
    likes: 83,
    body: `Long text wants a serif, a line length of 60 to 75 characters, and generous line height.

## The settings we use

| Setting | Value |
| --- | --- |
| Line length | 68ch |
| Line height | 1.7 |
| Paragraph spacing | 1em |

And no justified text on the web.`,
  },
  {
    title: 'Live data without a websocket server',
    author: 'Mateo Ruiz',
    tags: ['svelte', 'tooling'],
    createdAt: day('2026-09-16'),
    views: 1104,
    likes: 102,
    body: `A \`query.live\` generator is an async generator on the server. SvelteKit streams each value it yields to every component that reads it.

\`\`\`ts
export const getPostCount = query.live(async function* () {
  while (true) {
    yield await countPosts();
    await sleep(1000);
  }
});
\`\`\`

No extra server, no extra protocol.`,
  },
  {
    title: 'Accessible by default',
    author: 'Ada Okafor',
    tags: ['design', 'testing'],
    createdAt: day('2026-09-30'),
    views: 488,
    likes: 57,
    body: `Every input has a label. Every icon button has a name. Focus is always visible. Motion stops when the reader asks for less.

These are not features. They are the floor.`,
  },
  {
    title: 'Notes from a quiet refactor',
    author: 'Lin Chen',
    tags: ['notes', 'tooling'],
    createdAt: day('2026-10-14'),
    views: 266,
    likes: 19,
    body: `We renamed one module and moved two functions. It took a week, because we did it in twelve small pull requests that each kept the tests green.

Slow refactors are the fast ones.`,
  },
  {
    title: 'Draft: what to measure on a reading page',
    author: 'Sanna Virtanen',
    tags: ['design'],
    published: false,
    createdAt: day('2026-10-22'),
    views: 0,
    likes: 0,
    body: `Views, reading time, and where people stop reading. Not more.

*Still collecting notes for this one.*`,
  },
  {
    title: 'Draft: a checklist for releases',
    author: 'Mateo Ruiz',
    tags: ['tooling', 'notes'],
    published: false,
    createdAt: day('2026-10-28'),
    views: 0,
    likes: 0,
    body: `- [ ] Changelog
- [ ] Version bump
- [ ] Smoke test on a fresh install`,
  },
];
