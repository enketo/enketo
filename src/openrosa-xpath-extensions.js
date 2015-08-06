var openrosa_xpath_extensions = (function() {
  var ___start_vars___,
      xpathResult = {
        boolean: function(val) { return { t:'bool', v:val }; },
        number: function(val) { return { t:'num', v:val }; },
        string: function(val) { return { t:'str', v:val }; },
        dateString: function(val) {
          val = val.getFullYear() + '-' + zeroPad(val.getMonth()+1) + '-' +
              zeroPad(val.getDate());
          return xpathResult.string(val);
        }
      },
      zeroPad = function(n, len) {
        len = len || 2;
        n = n.toString();
        while(n.length < len) n = '0' + n;
        return n;
      },
      _uuid_part = function(c) {
          var r = Math.random()*16|0,
                  v=c=='x'?r:r&0x3|0x8;
          return v.toString(16);
      },
      uuid = function() {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                  .replace(/[xy]/g, _uuid_part);
      },
      ___end_vars___;
  return {
    int: function(v) { return xpathResult.number(parseInt(v, 10)); },
    now: function() { return xpathResult.number(Date.now()); },
    random: function() { return xpathResult.number(Math.random()); },
    regex: function(haystack, pattern) {
        return xpathResult.boolean(new RegExp(pattern).test(haystack)); },
    substr: function(string, startIndex, endIndex) {
        return xpathResult.string(string.slice(startIndex, endIndex)); },
    today: function() { return xpathResult.dateString(new Date()); },
    uuid: function() { return xpathResult.string(uuid()); },
  };
}());

if(typeof define === 'function') {
  define(function() { return openrosa_xpath_extensions; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = openrosa_xpath_extensions;
}

