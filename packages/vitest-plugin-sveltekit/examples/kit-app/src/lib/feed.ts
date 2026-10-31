import { error } from '@sveltejs/kit';
import * as v from 'valibot';

/** What `getFeed` sends: the number of posts and the latest few. */
export const feedSchema = v.object({
  count: v.pipe(v.number(), v.integer(), v.minValue(0)),
  latest: v.array(
    v.object({
      id: v.number(),
      title: v.pipe(v.string(), v.trim(), v.nonEmpty('A post needs a title')),
    })
  ),
});

export type Feed = v.InferOutput<typeof feedSchema>;

/** Checks a feed before it is sent, and fails with a 422 that names the first problem. */
export function checkFeed(value: unknown): Feed {
  const result = v.safeParse(feedSchema, value);
  if (result.success) return result.output;
  const [issue] = result.issues;
  const path = issue.path?.map((item) => item.key).join('.');
  error(422, `Invalid feed: ${path ? `${path}: ` : ''}${issue.message}`);
}
