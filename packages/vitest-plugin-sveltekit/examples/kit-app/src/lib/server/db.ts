// An in-memory store. Tier 2 (running the real remote functions in the browser) will swap this
// module for a real database with a mock file.

export interface Post {
  id: number;
  title: string;
  body: string;
}

export interface PostStats {
  views: number;
  likes: number;
}

const posts: Post[] = [
  { id: 1, title: 'Hello SvelteKit', body: 'Remote functions are typed RPC.' },
  { id: 2, title: 'Stories for everything', body: 'Mock the data, keep the component.' },
];

const listeners = new Set<() => void>();

export function listPosts(order: 'newest' | 'oldest'): Post[] {
  const sorted = [...posts].sort((a, b) => a.id - b.id);
  return order === 'newest' ? sorted.reverse() : sorted;
}

export function getPost(id: number): Post | undefined {
  return posts.find((post) => post.id === id);
}

export function createPost(title: string, body: string): Post {
  const post = { id: Math.max(0, ...posts.map((p) => p.id)) + 1, title, body };
  posts.push(post);
  notify();
  return post;
}

export function deletePost(id: number): void {
  const index = posts.findIndex((post) => post.id === id);
  if (index !== -1) posts.splice(index, 1);
  notify();
}

export function countPosts(): number {
  return posts.length;
}

export function statsFor(ids: number[]): Map<number, PostStats> {
  return new Map(ids.map((id) => [id, { views: id * 10, likes: id }]));
}

/** Resolves on the next change, or when `signal` aborts. */
export function nextChange(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      listeners.delete(done);
      resolve();
    };
    listeners.add(done);
    signal.addEventListener('abort', done, { once: true });
  });
}

function notify() {
  for (const listener of listeners) listener();
}
