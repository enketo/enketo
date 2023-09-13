const fs = require('fs');
const path = require('path');
const loadGruntTasks = require('load-grunt-tasks');
const nodeSass = require('node-sass');
const timeGrunt = require('time-grunt');

const dependencyRoots = [
    // Direct, unshared dependencies
    path.resolve(__dirname, './node_modules'),

    // Monorepo-shared dependencies
    path.resolve(__dirname, '../../node_modules'),
];

/** @type {Map<string, string>} */
const dependencyPaths = new Map();

/**
 * Resolves the base path of an installed dependency. Ideally we could use
 * `require.resolve` for this, but it eagerly resolves a given package's
 * `main`/`module`/etc entry paths, rather than the package's base path.
 *
 * @param {string} dependencyName
 */
const resolveDependencyPath = (dependencyName) => {
    const cached = dependencyPaths.get(dependencyName);

    if (cached != null) {
        return cached;
    }

    for (const root of dependencyRoots) {
        const resolved = path.resolve(root, dependencyName);

        if (fs.existsSync(resolved)) {
            dependencyPaths.set(dependencyName, resolved);

            return resolved;
        }
    }

    throw new Error(`Unable to resolve dependency path: ${dependencyName}`);
};

const ENKETO_CORE_PREFIX = `${resolveDependencyPath('enketo-core')}/`;

const MONOREPO_ROOT_PATH = path.resolve(__dirname, '../..');

const sassFilePrefixes = ['', '_'];
const resolvableSassExtensions = ['.scss', '.sass', '.css'];

/**
 * Resolves any Sass imports from dependencies, referenced by an "absolute" path,
 * where "absolute" is actually relative to the monorepo root. This simplifies
 * and stabilizes those imports, and preserves navigation in supporting editors.
 *
 * @param {string} imported
 */
const resolveSassPackageImport = (imported) => {
    if (!imported.startsWith('/')) {
        return null;
    }

    const packageRelativePath = imported.replace('/', './');
    const absolutePath = path.resolve(MONOREPO_ROOT_PATH, packageRelativePath);
    const extension = path.extname(absolutePath);

    if (extension !== '') {
        return {
            file: absolutePath,
        };
    }

    const dirName = path.dirname(absolutePath);
    const fileName = path.basename(absolutePath);

    const sassPaths = sassFilePrefixes.flatMap((prefix) =>
        resolvableSassExtensions.map((suffix) =>
            path.resolve(dirName, `${prefix}${fileName}${suffix}`)
        )
    );

    const sassPath = sassPaths.find((item) => fs.existsSync(item));

    if (sassPath == null) {
        return null;
    }

    return {
        file: sassPath,
    };
};

/**
 * @param {string} imported
 */
const resolveWidgetESMImport = (imported) => {
    if (imported.includes('../node_modules/enketo-core/')) {
        return imported
            .replace(
                /^(\.\.\/)+node_modules\/enketo-core\//,
                ENKETO_CORE_PREFIX
            )
            .replace(/(\.js)?$/, '.js');
    }

    return imported;
};

module.exports = (grunt) => {
    timeGrunt(grunt);
    loadGruntTasks(grunt, {
        config: '../../package.json',
    });

    let serverRootHooks;

    grunt.config.init({
        concurrent: {
            develop: {
                tasks: ['nodemon', 'watch'],
                options: {
                    logConcurrentOutput: true,
                },
            },
        },
        nodemon: {
            dev: {
                script: 'app.js',
                options: {
                    watch: ['app', 'config'],
                    // nodeArgs: [ '--debug' ],
                    env: {
                        NODE_ENV: 'development',
                        DEBUG: '*, -express:*, -send, -compression, -body-parser:*, -puppeteer:*',
                    },
                },
            },
        },
        sass: {
            options: {
                implementation: nodeSass,

                importer: resolveSassPackageImport,
            },
            compile: {
                cwd: 'app/views/styles',
                dest: 'public/css',
                expand: true,
                outputStyle: 'compressed',
                src: '**/*.scss',
                ext: '.css',
                flatten: true,
                extDot: 'last',
            },
        },
        watch: {
            sass: {
                files: [
                    '../enketo-core/src/**/*.scss',
                    '../enketo-core/widget/**/*.scss',
                    'app/views/styles/**/*.scss',
                    'widget/**/*.scss',
                ],
                tasks: ['shell:clean-css', 'sass'],
                options: {
                    spawn: false,
                    livereload: true,
                },
            },
            jade: {
                files: ['app/views/**/*.pug'],
                options: {
                    spawn: false,
                    livereload: true,
                },
            },
            language: {
                files: [
                    'app/views/**/*.pug',
                    'app/controllers/**/*.js',
                    'app/models/**/*.js',
                    'public/js/src/**/*.js',
                ],
                tasks: ['shell:clean-locales', 'shell:translation', 'i18next'],
            },
            js: {
                files: ['public/js/src/**/*.js', 'widget/**/*.js'],
                tasks: ['shell:clean-js', 'js'],
                options: {
                    spawn: false,
                    livereload: true,
                },
            },
            mochaTest: {
                files: ['app/**/*.js', 'test/server/**/*.js'],
                tasks: ['test-server:all'],
                options: {
                    atBegin: true,
                },
            },
        },
        shell: {
            'clean-css': {
                command: 'rm -f public/css/*',
            },
            'clean-locales': {
                command:
                    'find locales -name "translation-combined.json" -delete && rm -fr locales/??',
            },
            'clean-js': {
                command: 'rm -rf public/js/build/* && rm -f public/js/*.js',
            },
            translation: {
                command:
                    'echo "No automatic translation key generation at the moment."',
                // Does not work correctly yet for TError() calls and probably not for pug files either.
                // npx i18next -c ./i18next-parser.config.js
            },
            build: {
                command: 'node ./scripts/build.js',
            },
            nyc: {
                command:
                    'nyc --reporter html --reporter text-summary --reporter json --reporter lcov --report-dir ./test-coverage/server --include "app/**/*.js" grunt test-server:all',
            },
        },
        // test server JS
        mochaTest: {
            all: {
                options: {
                    reporter: 'dot',

                    /**
                     * Note: `grunt-mocha-test` passes `options` directly to
                     * Mocha's programmable API rather than as CLI options.
                     * For whatever reason, this means that `require` doesn't
                     * allow registering root hooks as "Root Hooks".
                     *
                     * @see {@link https://mochajs.org/#root-hook-plugins}
                     *
                     * This is a workaround to pass the hooks directly.
                     */
                    get rootHooks() {
                        return serverRootHooks;
                    },
                },
                src: ['test/server/**/*.spec.js'],
            },
            account: {
                src: ['test/server/account-*.spec.js'],

                get rootHooks() {
                    return serverRootHooks;
                },
            },
        },
        // test client JS
        karma: {
            options: {
                singleRun: true,
                configFile: 'test/client/config/karma.conf.js',
                customLaunchers: {
                    ChromeHeadlessDebug: {
                        base: 'ChromeHeadless',
                        flags: ['--no-sandbox', '--remote-debugging-port=9333'],
                    },
                },
            },
            headless: {
                browsers: ['ChromeHeadless'],
            },
            browsers: {
                browsers: [
                    'Chrome',
                    'ChromeCanary',
                    'Firefox',
                    'Opera' /* ,'Safari' */,
                ],
            },
            watch: {
                browsers: ['ChromeHeadlessDebug'],
                options: {
                    autoWatch: true,
                    client: {
                        mocha: {
                            timeout: Number.MAX_SAFE_INTEGER,
                        },
                    },
                    reporters: ['dots'],
                    singleRun: false,
                },
            },
        },
        env: {
            develop: {
                NODE_ENV: 'develop',
            },
            test: {
                NODE_ENV: 'test',
            },
            production: {
                NODE_ENV: 'production',
            },
        },
        i18next: {
            locales: {
                cwd: 'locales/src/',
                expand: true,
                src: ['*/'],
                include: [
                    '**/translation.json',
                    '**/translation-additions.json',
                ],
                rename(dest, src) {
                    return `${dest + src}translation-combined.json`;
                },
                dest: 'locales/build/',
            },
        },
    });

    grunt.registerTask('test-server:all', function testServerAll() {
        const done = this.async();

        import('./test/server/shared/root-hooks.mjs').then(
            ({ default: rootHooks }) => {
                serverRootHooks = rootHooks;

                grunt.task.run('mochaTest:all');
                done();
            }
        );
    });

    grunt.registerTask('test-server:account', function testServerAccount() {
        const done = this.async();

        import('./test/server/shared/root-hooks.mjs').then(
            ({ default: rootHooks }) => {
                serverRootHooks = rootHooks;

                grunt.task.run('mochaTest:account');
                done();
            }
        );
    });

    grunt.registerTask('widgets', 'generate widget reference files', () => {
        const WIDGETS_JS_LOC = 'public/js/build/';
        const WIDGETS_JS = `${WIDGETS_JS_LOC}widgets.js`;
        const WIDGETS_SASS_LOC = 'app/views/styles/component/';
        const WIDGETS_SASS = `${WIDGETS_SASS_LOC}_widgets.scss`;
        const PRE =
            '// This file is automatically generated with `grunt widgets`\n\n';
        const { widgets } = require('./app/models/config-model').server;
        const coreWidgets = require('./public/js/src/module/core-widgets');
        const paths = Object.keys(widgets).map(
            (key) => coreWidgets[widgets[key]] || widgets[key]
        );

        let num = 0;
        let content = `${
            PRE +
            paths
                .map((p) => {
                    const widgetPath = resolveWidgetESMImport(p);

                    if (grunt.file.exists(widgetPath)) {
                        num++;

                        return `import w${num} from '${widgetPath}';`;
                    }

                    return `//${p} not found`;
                })
                .join('\n')
        }\n\nexport default [${[...Array(num).keys()]
            .map((n) => `w${n + 1}`)
            .join(', ')}];`;
        grunt.file.write(WIDGETS_JS, content);
        grunt.log.writeln(`File ${WIDGETS_JS} created`);
        content = `${
            PRE +
            paths
                .map((p) => {
                    p = p.replace(/^(\.\.\/)+node_modules\//, '/node_modules/');

                    const resolved = resolveSassPackageImport(p);

                    if (resolved == null) {
                        return `//${p} not found`;
                    }

                    return `@import "${p}"`;
                })
                .join(';\n')
        };`;
        grunt.file.write(WIDGETS_SASS, content);
        grunt.log.writeln(`File ${WIDGETS_SASS} created`);
    });

    grunt.registerTask('default', [
        'clean',
        'locales',
        'widgets',
        'sass',
        'js',
    ]);
    grunt.registerTask('clean', [
        'shell:clean-js',
        'shell:clean-css',
        'shell:clean-locales',
    ]);
    grunt.registerTask('locales', ['i18next']);
    grunt.registerTask('js', ['widgets', 'shell:build']);
    grunt.registerTask('test', [
        'env:test',
        'js',
        'sass',
        'shell:nyc',
        'karma:headless',
    ]);
    grunt.registerTask('test-browser', ['env:test', 'sass', 'karma:browsers']);
    grunt.registerTask('test-watch-client', ['env:test', 'karma:watch']);
    grunt.registerTask('test-watch-server', ['env:test', 'watch:mochaTest']);
    grunt.registerTask('develop', [
        'env:develop',
        'i18next',
        'js',
        'sass',
        'concurrent:develop',
    ]);
    grunt.registerTask('test-and-build', [
        'env:test',
        'test-server:all',
        'karma:headless',
        'env:production',
        'default',
    ]);
};
