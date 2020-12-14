module.exports = {
  boolean: function(val) { return { t:'bool', v:val }; },
  number: function(val) { return { t:'num', v:val }; },
  string: function(val) { return { t:'str', v:val }; },
  date: function(val) {
    if(!(val instanceof Date)) throw new Error('Cannot create date from ' + val + ' (' + (typeof val) + ')');
    return { t:'date', v:val };
  }
};
