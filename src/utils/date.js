var DATE_STRING = /^\d\d\d\d-\d{1,2}-\d{1,2}(?:T\d\d:\d\d:\d\d\.?\d?\d?(?:Z|[+-]\d\d:\d\d)|.*)?$/;

function dateToDays(d, rounded) {
  var temp = null;
  if(d.indexOf('T') > 0) {
    temp = new Date(d);
  } else {
    temp = d.split('-');
    temp = new Date(temp[0], temp[1]-1, temp[2]);
  }
  var r = (temp.getTime()) / (1000 * 60 * 60 * 24);
  return rounded === false ? r : Math.round(r*100000)/100000;
}

/**
 * Get the number of days in any particular month
 * @link https://stackoverflow.com/a/1433119/1293256
 * @param  {integer} m The month (valid: 0-11)
 * @param  {integer} y The year
 * @return {integer}   The number of days in the month
 */
var daysInMonth = function (m, y) {
  switch (m) {
    case 1 :
      return (y % 4 == 0 && y % 100) || y % 400 == 0 ? 29 : 28;
    case 8 : case 3 : case 5 : case 10 :
      return 30;
    default :
      return 31;
  }
};

/**
 * Check if a date is valid
 * @link https://stackoverflow.com/a/1433119/1293256
 * @param  {[type]}  y The year
 * @param  {[type]}  m The month
 * @param  {[type]}  d The day
 * @return {Boolean}   Returns true if valid
 */
var isValidDate = function (y, m, d) {
  m = parseInt(m, 10) - 1;
  return m >= 0 && m < 12 && d > 0 && d <= daysInMonth(m, y);
};

module.exports = {
  DATE_STRING,
  dateToDays,
  isValidDate
};
