/**
 * XForms 1.1 digest() function.
 * @see https://www.w3.org/TR/xforms/#fn-digest
 *
 * This implementation depends on the node-forge module, and will throw an Error
 * at runtime if the module is not available.
 */
module.exports = (message, algo, encoding) => {
  let forge;
  try {
    forge = require('node-forge');
  } catch(err) {
    throw new Error(`Cannot find module 'node-forge'; this is required to use the digest() function.`);
  }

  message = message.v;
  algo = algo && algo.v && algo.v.toLowerCase();
  encoding = (encoding && encoding.v && encoding.v.toLowerCase()) || 'base64';
  if(!algo || !/^(md5|sha-1|sha-256|sha-384|sha-512)$/.test(algo)) {
    throw new Error('Invalid algo.');
  }
  if(!/^(base64|hex)$/.test(encoding)) {
    throw new Error('Invalid encoding.');
  }
  const md = forge.md[algo.replace('-', '')].create();
  md.update(message);
  const hashBuffer = md.digest();
  if(!encoding || encoding === 'base64') {
    return forge.util.encode64(hashBuffer.bytes());
  }
  return md.digest().toHex();
};
