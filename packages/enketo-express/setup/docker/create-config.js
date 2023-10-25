// This is translated directly from the previous `create_config.py`, with minor
// modifications for clarity/language/runtime.
const { Buffer } = require('node:buffer');
const { randomFillSync } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SCRIPT_DIR_PATH = __dirname;
const PACKAGE_ROOT_PATH = path.resolve(SCRIPT_DIR_PATH, '../..');

/**
 * Automate the inconvenient task of generating and maintaining a consistent
 * encryption key.
 *
 * @return {string}
 */
const getOrCreateEncryptionKey = () => {
    // Attempt to get the key from an environment variable.
    let encryptionKey = process.env.ENKETO_ENCRYPTION_KEY;

    // If the key wasn't in the environment, attempt to get it from disk.
    const secretsDirPath = path.join(CURRENT_DIR_PATH, 'secrets/');
    const encryptionKeyFilePath = path.join(
        secretsDirPath,
        'enketo_encryption_key.txt'
    );

    if (!encryptionKey && fs.existsSync(encryptionKeyFilePath)) {
        encryptionKey = fs.readFileSync(encryptionKeyFilePath, 'utf-8').trim();
    }

    // If the key couldn't be retrieved from disk, generate and store a new one.
    else if (!encryptionKey) {
        encryptionKey = randomFillSync(Buffer.alloc(256)).toString('base64');

        if (!fs.existsSync(secretsDirPath)) {
            fs.mkdirSync(secretsDirPath, { recursive: true });
        }

        fs.writeFileSync(encryptionKeyFilePath, encryptionKey, 'utf-8');
    }

    return encryptionKey;
};

const sortObject = (object) => {
    return Object.fromEntries(
        Object.entries(object).sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
    );
};

const createConfig = () => {
    const CONFIG_FILE_PATH = path.join(PACKAGE_ROOT_PATH, 'config/config.json');

    /** @type {import('../../config/config.json')} */
    let config;

    if (!fs.existsSync(CONFIG_FILE_PATH)) {
        throw new Error(
            `No Enketo Express configuration found at "${CONFIG_FILE_PATH}"`
        );
    } else {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
    }

    // Ensure an API key was set, retrieving it from the environment as a fallback.
    let linkedFormAndDataServer = config['linked form and data server'];

    if (linkedFormAndDataServer == null) {
        linkedFormAndDataServer = {};
        config['linked form and data server'] = linkedFormAndDataServer;
    }

    let apiKey = linkedFormAndDataServer['api key'];

    if (apiKey == null) {
        apiKey = process.env.ENKETO_API_KEY;
        linkedFormAndDataServer['api key'] = apiKey;
    }

    if (!config['linked form and data server']['api key']) {
        throw new Error('An API key for Enketo Express is required.');
    }

    // Retrieve/generate the encryption key if not present.
    /** @type {string} */
    let encryptionKey = config['encryption key'];

    if (encryptionKey == null) {
        encryptionKey = getOrCreateEncryptionKey();
        config['encryption key'] = encryptionKey;
    }

    // Set the Docker Redis settings.
    config.redis = config.redis ?? {};
    config.redis.main = config.redis.main ?? {};
    config.redis.main.host = config.redis.main.host ?? 'redis_main';
    config.redis.cache = config.redis.cache ?? {};
    config.redis.cache.host = config.redis.cache.host ?? 'redis_cache';
    config.redis.cache.port = config.redis.cache.port ?? '6379';

    // Write the potentially-updated config file to disk.
    fs.writeFileSync(
        // Sort keys so that the file remains consistent between runs.
        // Indent for readability.
        JSON.stringify(sortObject(config), null, 4)
    );
};

createConfig();
