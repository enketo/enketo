const forge = require('node-forge');

const digest = (message, algo, encoding) => {
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

module.exports = {
  digest
};
