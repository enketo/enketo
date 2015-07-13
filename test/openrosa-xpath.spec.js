var openrosa_xpath = require('../src/openrosa-xpath.js'),
    assert = require('chai').assert;

describe('openrosa-xpath', function() {
  it('should provide a function', function() {
    assert.equal(typeof openrosa_xpath, 'function');
  });
});
