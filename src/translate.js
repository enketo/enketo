var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var translate = function(key) {
  if(key.startsWith('date.dayofweek.')) return DAYS  [intFrom(key, 'date.dayofweek.')];
  if(key.startsWith('date.month.'))     return MONTHS[intFrom(key, 'date.month.'    )];
  return key;
};

function intFrom(key, prefix) {
  return Number.parseInt(key.substring(prefix.length), 10) - 1;
}


if(typeof define === 'function') {
  define(function() { return translate; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = translate;
}
