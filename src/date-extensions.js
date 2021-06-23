// imported from https://github.com/enketo/enketo-xpathjs/blob/master/src/date-extensions.js
// TODO probably shouldn't be changing Date.prototype
/**
 * Converts a native Date UTC String to a RFC 3339-compliant date string with local offsets
 * used in ODK, so it replaces the Z in the ISOstring with a local offset
 * @param {Date} date
 * @return {string} a datetime string formatted according to RC3339 with local offset
 */
const toISOLocalString = (date) => {
  //2012-09-05T12:57:00.000-04:00 (ODK)

  if(date.toString() === 'Invalid Date') {
    return date.toString();
  }

  var dt = new Date(date.getTime() - (date.getTimezoneOffset() * 60 * 1000)).toISOString()
      .replace('Z', date.getTimezoneOffsetAsTime());

  if(dt.indexOf('T00:00:00.000') > 0) {
    return dt.split('T')[0];
  } else {
    return dt;
  }
};

/**
 * @param {Date} date
 * @return {string}
 */
const getTimezoneOffsetAsTime = (date) => {
  var offsetMinutesTotal;
  var hours;
  var minutes;
  var direction;
  var pad2 = function(x) {
    return (x < 10) ? '0' + x : x;
  };

  if(date.toString() === 'Invalid Date') {
    return date.toString();
  }

  offsetMinutesTotal = date.getTimezoneOffset();

  direction = (offsetMinutesTotal < 0) ? '+' : '-';
  hours = pad2(Math.floor(Math.abs(offsetMinutesTotal / 60)));
  minutes = pad2(Math.floor(Math.abs(offsetMinutesTotal % 60)));

  return direction + hours + ':' + minutes;
};

/**
 * @deprecated
 * @see {toISOLocalString}
 */
Date.prototype.toISOLocalString = function() {
  return toISOLocalString(this);
};

/**
 * @deprecated
 * @see {getTimezoneOffsetAsTime}
 */
Date.prototype.getTimezoneOffsetAsTime = function() {
  return getTimezoneOffsetAsTime(this);
};

module.exports = {
  getTimezoneOffsetAsTime,
  toISOLocalString,
};
