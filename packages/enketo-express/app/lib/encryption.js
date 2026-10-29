const crypto = require('crypto');

/**
 * Derives a 32-byte Buffer from an arbitrary string for use as an AES-256-GCM key.
 *
 * @param {string} encryptionKeyString
 * @return {Buffer}
 */
function deriveEncryptionKey(encryptionKeyString) {
    return crypto.createHash('sha256').update(encryptionKeyString).digest();
}

module.exports = { deriveEncryptionKey };
