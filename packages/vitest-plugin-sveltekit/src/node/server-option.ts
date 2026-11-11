import { createFilter } from 'vite';

type Arrayable<T> = T | readonly T[];

/** The remote files whose server code server mode loads; see `VitestPluginSvelteKitOptions`. */
export type ServerOption =
  | boolean
  | {
      /** Remote files to run for real (picomatch, relative to the project root). Default: all. */
      include?: Arrayable<string | RegExp>;
      /** Remote files to leave out, even when `include` matches them. */
      exclude?: Arrayable<string | RegExp>;
    };

/**
 * Which remote files bring their server code along, as a test on an absolute path, or `null` for
 * mock mode (`false`, the default). `true` and an object without `include` mean every remote file
 * (minus `exclude`). Unlike `createFilter`, an empty `include` matches nothing.
 */
export function serverFilter(
  option: ServerOption | undefined,
  root: string
): ((file: string) => boolean) | null {
  if (!option) return null;
  if (option === true) return () => true;
  const include = option.include as string | RegExp | Array<string | RegExp> | undefined;
  if (Array.isArray(include) && include.length === 0) return () => false;
  const exclude = option.exclude as string | RegExp | Array<string | RegExp> | undefined;
  return createFilter(include, exclude, { resolve: root });
}
