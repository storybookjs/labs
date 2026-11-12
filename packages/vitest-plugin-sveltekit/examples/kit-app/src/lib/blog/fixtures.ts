// Data for mocked stories and tests: the seed posts, shaped like the remote functions' results.
import { postRows, seedPosts } from '#lib/server/seed.ts';

import {
  PAGE_SIZE,
  type PostDetail,
  type PostPage,
  type PostRow,
  type PostSummary,
  type TagCount,
  toSummary,
} from './posts.ts';

export const postDetails: PostDetail[] = postRows(seedPosts)
  .map((row, index) => {
    // The table's defaults, for the columns a seed post leaves out.
    const post: PostRow = {
      id: index + 1,
      title: row.title,
      body: row.body ?? '',
      author: row.author ?? 'Field Notes',
      tags: row.tags ?? [],
      published: row.published ?? true,
      createdAt: row.createdAt as Date,
      updatedAt: (row.updatedAt ?? row.createdAt) as Date,
    };
    return { ...toSummary(post), body: post.body };
  })
  .reverse();

export const postSummaries: PostSummary[] = postDetails.map(
  ({ body: _body, ...summary }) => summary
);

export const published = postSummaries.filter((post) => post.published);

export const tagCounts: TagCount[] = Object.entries(
  published
    .flatMap((post) => post.tags)
    .reduce<Record<string, number>>(
      (counts, tag) => ({ ...counts, [tag]: (counts[tag] ?? 0) + 1 }),
      {}
    )
)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

/** The first page of the published posts, as `listPosts` returns it. */
export function postPage(posts: PostSummary[] = published, page = 1): PostPage {
  return {
    posts: posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: posts.length,
    page,
    pageCount: Math.max(1, Math.ceil(posts.length / PAGE_SIZE)),
    lastPublishedAt: Math.max(
      0,
      ...posts.filter((post) => post.published).map((post) => post.createdAt.getTime())
    ),
    tags: tagCounts,
  };
}

export const longPost: PostDetail = {
  ...postDetails[0]!,
  id: 99,
  title:
    'A very long title that keeps going, to check how the layout wraps a heading over several lines on a narrow screen',
  tags: ['design', 'writing', 'notes', 'testing', 'tooling'],
  body: Array.from({ length: 6 }, (_, i) => `## Part ${i + 1}\n\n${postDetails[i]!.body}`).join(
    '\n\n'
  ),
};
