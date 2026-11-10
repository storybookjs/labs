import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { defineConfig } from 'vite-plus';

import pkg from './package.json' with { type: 'json' };

const define = {
  __STORYBOOK_VITE_PLUGIN_VERSION__: JSON.stringify(pkg.version),
};

/**
 * Writes the Angular builder manifest and the `dev-server` schema: `@angular/build:dev-server`'s own options plus the
 * Storybook ones. Angular does not export its schema and forbids unknown options, so it is copied
 * at pack time, and unknown options are allowed so newer Angular flags still reach the builder.
 */
async function writeAngularBuilderSchema(outDir: string): Promise<void> {
  const require = createRequire(import.meta.url);
  const angularBuild = dirname(require.resolve('@angular/build/package.json'));
  const schema = JSON.parse(
    await readFile(join(angularBuild, 'src/builders/dev-server/schema.json'), 'utf8')
  );

  schema.title = 'Angular dev server with embedded Storybook';
  schema.description = 'Options of @angular/build:dev-server plus the embedded Storybook mount.';
  delete schema.$id;
  schema.additionalProperties = true;
  schema.properties.storybookConfigDir = {
    type: 'string',
    default: '.storybook',
    description: 'Storybook configuration directory, relative to the project root.',
  };
  schema.properties.storybookBase = {
    type: 'string',
    default: '/__storybook',
    description: 'Path the embedded Storybook is mounted under.',
  };

  const angularDir = join(outDir, 'angular');
  await mkdir(angularDir, { recursive: true });
  const write = (file: string, data: unknown) =>
    writeFile(join(angularDir, file), `${JSON.stringify(data, null, 2)}\n`);
  await Promise.all([
    write('dev-server-schema.json', schema),
    // Angular CLI resolves `@storybook/vite-plugin/angular:dev-server` through this nested
    // manifest, exported as `./angular/package.json`, so nothing Angular-specific sits at the root.
    write('package.json', { builders: './builders.json' }),
    write('builders.json', {
      builders: {
        'dev-server': {
          implementation: './builder.mjs',
          schema: './dev-server-schema.json',
          description: 'Angular CLI development server with Storybook mounted on the same port.',
        },
      },
    }),
  ]);
}

export default defineConfig({
  define,
  pack: {
    entry: ['src/index.ts', 'src/preset.ts', 'src/angular/index.ts', 'src/angular/builder.ts'],
    dts: true,
    // Optional peers of the Angular entry; never inline their code or types.
    deps: { neverBundle: [/^@angular\//, /^@angular-devkit\//] },
    exports: {
      // The builder is loaded by Angular CLI from the manifest, not imported.
      exclude: ['angular/builder'],
      customExports: { './angular/package.json': './dist/angular/package.json' },
    },
    define,
    hooks: {
      'build:done': (context) => writeAngularBuilderSchema(context.options.outDir),
    },
  },
  test: {
    environment: 'node',
    // Keeps Vitest away from the examples' Playwright specs.
    include: ['src/**/*.test.ts'],
  },
});
