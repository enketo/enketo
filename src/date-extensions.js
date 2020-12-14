/**
 * Converts a native Date UTC String to a RFC 3339-compliant date string with local offsets
 * used in ODK, so it replaces the Z in the ISOstring with a local offset
 * @return {string} a datetime string formatted according to RC3339 with local offset
 */
Date.prototype.toISOLocalString = function() {
  //2012-09-05T12:57:00.000-04:00 (ODK)

  if(this.toString() === 'Invalid Date') {
    return this.toString();
  }

  var dt = new Date(this.getTime() - (this.getTimezoneOffset() * 60 * 1000)).toISOString()
      .replace('Z', this.getTimezoneOffsetAsTime());

  if(dt.indexOf('T00:00:00.000') > 0) {
    return dt.split('T')[0];
  } else {
    return dt;
  }
};

Date.prototype.getTimezoneOffsetAsTime = function() {
  var offsetMinutesTotal;
  var hours;
  var minutes;
  var direction;
  var pad2 = function(x) {
    return (x < 10) ? '0' + x : x;
  };

  if(this.toString() === 'Invalid Date') {
    return this.toString();
  }

  offsetMinutesTotal = this.getTimezoneOffset();

  direction = (offsetMinutesTotal < 0) ? '+' : '-';
  hours = pad2(Math.floor(Math.abs(offsetMinutesTotal / 60)));
  minutes = pad2(Math.floor(Math.abs(offsetMinutesTotal % 60)));

  return direction + hours + ':' + minutes;
};
