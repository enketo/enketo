/**
 * @module offline-resources-controller
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const router = express.Router();
const config = require('../models/config-model').server;

// var debug = require( 'debug' )( 'offline-controller' );

// Cache the build hash once at startup for performance in production
// In development, always recalculate to pick up file changes
const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'develop';
let cachedBuildHash = null;

const shouldCacheBuildHash = !isDevelopment;

/**
 * Calculates a hash of all built client files to ensure cache invalidation on code changes
 */
function getBuildFilesHash() {
    // In development, always recalculate. In production, return cached hash if available.
    if (shouldCacheBuildHash && cachedBuildHash !== null) {
        return cachedBuildHash;
    }

    const dirs = [
        path.resolve(config.root, 'public/js/build'),
        path.resolve(config.root, 'public/css'),
        path.resolve(config.root, 'app/views'),
        path.resolve(config.root, 'locales/build'),
    ];
    const hash = crypto.createHash('md5');

    dirs.forEach((dir) => {
        try {
            const files = fs.readdirSync(dir, { recursive: true });
            files.forEach((file) => {
                const filePath = path.join(dir, file);
                try {
                    if (
                        fs.statSync(filePath).isFile() &&
                        !filePath.endsWith('.map')
                    ) {
                        const content = fs.readFileSync(filePath);
                        hash.update(content);
                    }
                } catch (err) {
                    // Skip files that can't be read
                }
            });
        } catch (e) {
            // If directory doesn't exist or can't be read, continue
            console.warn(`Could not read directory ${dir}:`, e.message);
        }
    });

    const computedHash = hash.digest('hex').substring(0, 7);

    // Cache the hash in production only (in development, recalculate every time)
    if (shouldCacheBuildHash) {
        cachedBuildHash = computedHash;
    }

    return computedHash;
}

module.exports = (app) => {
    app.use(`${app.get('base path')}/`, router);
};
router.get('/x/offline-app-worker.js', (req, res, next) => {
    if (config['offline enabled'] === false) {
        const error = new Error(
            'Offline functionality has not been enabled for this application.'
        );
        error.status = 404;
        next(error);
    } else {
        res.set('Content-Type', 'text/javascript')
            .set('Cache-Control', 'no-cache')
            .send(getScriptContent());
    }
});

/**
 * Assembles script contentå
 */
function getScriptContent() {
    // Determining hash every time, is done to make development less painful (refreshing service worker)
    // The partialScriptHash is not actually required but useful to see which offline-app-worker-partial.js is used during troubleshooting.
    // by going to http://localhost:8005/x/offline-app-worker.js and comparing the version with the version shown in the side slider of the webform.
    const partialOfflineAppWorkerScript = fs.readFileSync(
        path.resolve(
            config.root,
            'public/js/src/module/offline-app-worker-partial.js'
        ),
        'utf8'
    );
    const partialScriptHash = crypto
        .createHash('md5')
        .update(partialOfflineAppWorkerScript)
        .digest('hex')
        .substring(0, 7);
    const configurationHash = crypto
        .createHash('md5')
        .update(JSON.stringify(config))
        .digest('hex')
        .substring(0, 7);

    const buildHash = getBuildFilesHash();
    const version = [
        config.version,
        configurationHash,
        partialScriptHash,
        buildHash,
    ].join('-');

    // We add as few explicit resources as possible because the offline-app-worker can do this dynamically and that is preferred
    // for easier maintenance of the offline launch feature.
    const resources = config['themes supported']
        .reduce((accumulator, theme) => {
            accumulator.push(
                `${config['base path']}${config['offline path']}/css/theme-${theme}.css`
            );
            accumulator.push(
                `${config['base path']}${config['offline path']}/css/theme-${theme}.print.css`
            );

            return accumulator;
        }, [])
        .concat([
            `${config['base path']}${config['offline path']}/images/icon_180x180.png`,
        ]);

    return `
const version = '${version}';
const resources = [
    '${resources.join("',\n    '")}'
];

${partialOfflineAppWorkerScript}`;
}
