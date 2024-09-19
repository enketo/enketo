import { resolve } from 'path';
import type { LibraryFormats } from 'vite';
import type { UserConfig } from 'vitest/config';
import { defineConfig } from 'vitest/config';
import config from './config/config.json';
import { define, TARGET_ENV } from './config/build.shared';

export default defineConfig(async () => {
    const isWeb = TARGET_ENV === 'web';
    const entryNames = isWeb ? ['transformer'] : ['app', 'transformer'];
    const entry = entryNames.map((name) =>
        resolve(__dirname, `./src/${name}.ts`)
    );
    const formats = (isWeb ? ['es'] : ['es', 'cjs']) satisfies LibraryFormats[];
    const emptyOutDir = process.env.EMPTY_OUT_DIR === 'true';

    const external = [
        'body-parser',
        'crypto',
        'css.escape',
        'express',
        'fs',
        'libxslt',
        'module',
        'node1-libxmljsmt-myh',
        'path',
        'undici',
        'url',
        'vite-node',
        'vite',
    ];

    const webDeps = ['language-tags', 'string-direction'];

    if (!isWeb) {
        external.push(...webDeps);
    }

    const input = isWeb
        ? ['./src/transformer.ts']
        : ['./src/app.ts', './src/transformer.ts', './config/config.json'];

    const isViteNodeRuntime = process.argv.some((arg) =>
        arg.endsWith('/vite-node')
    );
    const isViteRuntime =
        isViteNodeRuntime ||
        process.argv.some((arg) => arg.endsWith(`/vitest`));

    /**
     * Use Vite's default {@link https://vitejs.dev/config/build-options.html#build-target `modules`} target for Vite runtimes (app.js, test) and web.
     */
    const target = isWeb || isViteRuntime ? 'modules' : 'node14';

    const alias = isWeb
        ? [
              {
                  find: /^libxslt$/,
                  replacement: './src/dom/web/libxslt.ts',
              },
              {
                  find: /^enketo-transformer\/dom$/,
                  replacement: './src/dom/web/index.ts',
              },
              {
                  find: /^\/@fs\/(.*)/,
                  replacement: '$1',
              },
          ]
        : [
              {
                  find: /^enketo-transformer\/dom$/,
                  replacement: './src/dom/node/index.ts',
              },
          ];

    const baseName = isWeb ? 'enketo-transformer/web' : 'enketo-transformer';

    return {
        assetsInclude: ['**/*.xml', '**/*.xsl'],
        build: {
            lib: {
                entry,
                formats,
                name: baseName,
                // Note: this is only called for Node builds.
                fileName(format, entryName) {
                    const extension = format === 'es' ? '.js' : '.cjs';

                    return `${baseName}/${entryName.replace(
                        'src/',
                        ''
                    )}${extension}`;
                },
            },
            emptyOutDir,
            minify: false,
            outDir: 'dist',
            rollupOptions: {
                external,
                input,
                output: {
                    // This suppresses a warning for modules with both named and
                    // default exporrs when building for CommonJS (UMD in our
                    // current build). It's safe to suppress this warning because we
                    // have explicit tests ensuring both the default and named
                    // exports are consistent with the existing public API.
                    exports: 'named',
                    preserveModules: !isWeb,
                },
                treeshake: true,
            },
            sourcemap: true,
            target,
        },
        define,
        esbuild: {
            define,
            format: 'esm',
            sourcemap: true,
        },
        optimizeDeps: {
            exclude: external,
        },
        resolve: { alias },
        server: {
            port: config.port,
            fs: {
                cachedChecks: false, // https://github.com/vitejs/vite/issues/15784
            },
        },
        test: {
            // Vitest uses thread-based concurrency by defualt.
            // While this would significantly improve the speed
            // of test runs, native Node extensions using N-API
            // are often not thread safe. In this case, that
            // means we cannot use concurrency for testing
            // functionality which depends on libxmljs/libxslt.
            //
            // In Vitest 0.29.0+, the `singleThread` option must
            // be set to achieve the same behavior as `threads`
            // did previously. The `threads` option must *also*
            // be set to prevent spinning up threads which may
            // fail to close when tests complete.
            threads: false,
            singleThread: true,

            chaiConfig: {
                // Preserves previous truncation in snapshots.
                // This isn't ideal, but it helps to prevent
                // Vitest from creating an enormous diff of
                // reordered snapshots which otherwise pass.
                truncateThreshold: 40,
            },

            coverage: {
                provider: 'istanbul',
                include: ['src/**/*.ts'],
                reporter: ['html', 'text-summary', 'json'],
                reportsDirectory: './test-coverage',
            },

            globals: false,
            globalSetup: isWeb ? 'test/web/setup.ts' : undefined,
            include: ['test/**/*.spec.ts'],
            reporters: 'verbose',
            sequence: { shuffle: true },
        },
    } satisfies UserConfig;
});
