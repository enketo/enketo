var openrosa_xpath = function(e) {
  _uuid_part = function(c) {
      var r = Math.random()*16|0,
              v=c=='x'?r:r&0x3|0x8;
      return v.toString(16);
  },
  uuid = function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
              .replace(/[xy]/g, _uuid_part);
  };

  if(e === 'uuid()') {
    return uuid();
  }
};

if(typeof define === 'function') {
  define(function() { return openrosa_xpath; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = openrosa_xpath;
}
