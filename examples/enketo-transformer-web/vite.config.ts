import { defineConfig } from 'vite';
import type { AliasOptions, ResolveOptions } from 'vite';
import solidPlugin from 'vite-plugin-solid';

import { define } from '../../packages/enketo-transformer/config/build.shared';

const { ENV } = process.env;

const external = [
    '../src/api.ts',
    '../src/app.ts',
    '../src/dom/node/index.ts',
    'path',
];

interface Resolve extends ResolveOptions {
    alias?: AliasOptions;
}

const resolve: Resolve =
    ENV === 'dev'
        ? {
              alias: {
                  'enketo-transformer/dom': '../src/dom/web/index.ts',
                  'enketo-transformer/web': '../src/transformer.ts',
              },
          }
        : {};

export default defineConfig({
    appType: 'spa',
    assetsInclude: ['**/*.xml', '**/*.xsl', '../**/*.xml', '../**/*.xsl'],
    build: {
        rollupOptions: {
            external,
            input: ['./demo.tsx'],
            treeshake: true,
        },
        target: 'esnext',
    },
    define,
    plugins: [solidPlugin()],
    resolve,
    server: {
        port: 3000,
    },
});
