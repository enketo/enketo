var {dateToDays} = require('./date');

function isNumber(value) {
  if(typeof value === 'string') {
    var nbr = value.replace(/["']/g, "");
    // return nbr.trim().length && /^\d+$/.test(nbr.trim());
    return nbr.trim().length && !isNaN(nbr.trim());
  }
  return typeof value === 'number';
}

function handleOperation(lhs, op, rhs, config) {
  //Removes quotes for numbers, detect and convert date/datetime strings
  if(op.v === '+' ) {
    // Operands will always be converted to numbers, no concatenation.
    if (lhs.t === 'arr'){
      // only take first of nodeset
      lhs = {t: 'num', v: lhs.v[0]};
    }
    if (rhs.t === 'arr'){
      // only take first of nodeset
      rhs = {t: 'num', v: rhs.v[0]};
    }
    if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(lhs.v)) {
      lhs.v = dateToDays(lhs.v, false);
    } else {
      lhs.v = Number(lhs.v);
    }
    if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(rhs.v)){
      rhs.v = dateToDays(rhs.v, false);
    } else {
      rhs.v = Number(rhs.v);
    }
  }

  //Comparing node expressions with numbers/strings/etc
  if(lhs.t === 'arr' && lhs.v.length === 1 && rhs.t === 'num') {
    if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(lhs.v[0])) {
      lhs = {t: 'num', v: dateToDays(lhs.v[0], false)};
    }
  }
  if(rhs.t === 'arr' && rhs.v.length === 1 && lhs.t === 'num') {
    if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(rhs.v[0])) {
      rhs = {t: 'num', v: dateToDays(rhs.v[0], false)};
    }
  }

  if(lhs.t === 'arr' && lhs.v.length === 1 && rhs.t === 'str') {
    lhs = {t: 'str', v: lhs.v[0]};
  }
  if(rhs.t === 'arr' && rhs.v.length === 1 && lhs.t === 'str') {
    rhs = {t: 'str', v: rhs.v[0]};
  }
  if(rhs.t === 'arr' && rhs.v.length === 1 &&
    lhs.t === 'arr' && lhs.v.length === 1) {
    lhs = {t: 'str', v: lhs.v[0]};
    rhs = {t: 'str', v: rhs.v[0]};
  }

  if(lhs.t === 'str' && /^\d\d\d\d-\d{1,2}-\d{1,2}/.test(lhs.v)) {
    lhs = {t: 'num', v: dateToDays(lhs.v, false)};
  }

  if(rhs.t === 'str' && /^\d\d\d\d-\d{1,2}-\d{1,2}/.test(rhs.v)) {
    rhs = {t: 'num', v: dateToDays(rhs.v, false)};
  }

  if(op.v === '-' && (isNaN(lhs.v) || isNaN(rhs.v))) {
    return NaN;
  }

  if(/^(=|!=)$/.test(op.v)) {
    if(lhs.t === 'str' && rhs.t === 'bool') {
      if(lhs.v.length > 0 && lhs.v === '1') {
        lhs = {t: 'bool', v: true};
      } else if(lhs.v === '') {
        lhs = {t: 'bool', v: false};
      } else {
        lhs = {t: 'bool', v: undefined};
      }
    }
    if(rhs.t === 'str' && lhs.t === 'bool') {
      if(rhs.v.length > 0 && rhs.v === '1') {
        rhs = {t: 'bool', v: true};
      } else if(rhs.v === '') {
        rhs = {t: 'bool', v: false};
      } else {
        rhs = {t: 'bool', v: undefined};
      }
    }

    if(lhs.t === 'num' && rhs.t === 'bool') {
      lhs = {t: 'bool', v: Boolean(lhs.v)};
    }
    if(rhs.t === 'num' && lhs.t === 'bool') {
      rhs = {t: 'bool', v: Boolean(rhs.v)};
    }
  }

  switch(op.v) {
    case '+':  return lhs.v + rhs.v;
    case '-':  return lhs.v - rhs.v;
    case '*':  return lhs.v * rhs.v;
    case '/':  return lhs.v / rhs.v;
    case '%':  return lhs.v % rhs.v;
    case '=':
      if(/^(num|str)$/.test(lhs.t) && rhs.t === 'arr') {return rhs.v.includes(lhs.string || lhs.v);}
      if(/^(num|str)$/.test(rhs.t) && lhs.t === 'arr') {return lhs.v.includes(rhs.string || rhs.v);}
      if(lhs.t === 'bool' && rhs.t === 'arr') {return lhs.v === rhs.v.length > 0;}
      if(rhs.t === 'bool' && lhs.t === 'arr') {return rhs.v === lhs.v.length > 0;}

      return lhs.v == rhs.v;
    case '<':
      if(lhs.t === 'bool') {
        if(lhs.v === false && rhs.t === 'arr' && rhs.v.length > 0) return true;
        if(lhs.v === true && rhs.t === 'num') return 1 < rhs.v;
        if(lhs.v === false && rhs.t === 'num') return 0 < rhs.v;
        if(lhs.v === false && rhs.t === 'bool') return rhs.v === true;
        return false;
      }
      if(rhs.t === 'bool') {
        if(rhs.v === true && lhs.t === 'arr' && lhs.v.length === 0) return true;
        if(rhs.v === true && lhs.t === 'num' && lhs.v < 1) return true;
        return false;//rhs = {t: 'num', v: rhs.v === true ? 1 : 0, string: rhs.v === true ? '1' : '0'};
      }

      if(lhs.t === 'arr' && lhs.v.length > 0) {
        for(var iii=0;iii<lhs.v.length;iii++) {
          if(Number(lhs.v[iii]) < rhs.v) return true;
        }
        return false;
      }
      if(rhs.t === 'arr' && rhs.v.length > 0) {
        for(var k=0;k<rhs.v.length;k++) {
          if(lhs.v < Number(rhs.v[k])) return true;
        }
        return false;
      }
      if(lhs.t === 'arr' && lhs.v.length===0) lhs ={t: 'num', string: '0', v: 0};
      if(rhs.t === 'arr' && rhs.v.length===0) rhs ={t: 'num', string: '0', v: 0};
      if(lhs.t === 'str' && rhs.t === 'str' && config.allowStringComparison) return lhs.v < rhs.v;
      if(!isNumber(lhs.v) || !isNumber(rhs.v)) return false;
      return lhs.v < rhs.v;
    case '>':
      if(lhs.t === 'bool') {
        if(lhs.v === true && rhs.t === 'arr' && rhs.v.length === 0) return true;
        if(lhs.v === true && rhs.t === 'num') return 1 > rhs.v;
        if(lhs.v === true && rhs.t === 'bool') return 1 > (rhs.v === true ?  1 : 0);
        return false;//lhs = {t: 'num', v: lhs.v === true ? 1 : 0, string: lhs.v === true ? '1' : '0'};
      }
      if(rhs.t === 'bool') {
        if(rhs.v === false && lhs.t === 'arr' && lhs.v.length > 0) return true;
        if(rhs.v === false && lhs.t === 'num') return lhs.v > 0;
        if(rhs.v === true && lhs.t === 'num') return lhs.v > 1;
        if(lhs.t === 'num') return lhs.v > rhs.v === true ? 1 : 0;
        return false;
      }

      if(lhs.t === 'arr' && lhs.v.length > 0) {
        for(var j=0;j<lhs.v.length;j++) {
          if(Number(lhs.v[j]) > rhs.v) return true;
        }
        return false;
      }
      if(rhs.t === 'arr' && rhs.v.length > 0) {
        for(var l=0;l<rhs.v.length;l++) {
          if(lhs.v > Number(rhs.v[l])) return true;
        }
        return false;
      }

      if(lhs.t === 'arr' && lhs.v.length===0) lhs ={t: 'num', string: '0', v: 0};
      if(lhs.t === 'bool' && lhs.v === true) lhs ={t: 'num', string: '1', v: 1};
      if(lhs.t === 'bool' && lhs.v === false) lhs ={t: 'num', string: '0', v: 0};
      if(rhs.t === 'arr' && rhs.v.length===0) rhs ={t: 'num', string: '0', v: 0};
      if(rhs.t === 'bool' && rhs.v === true) rhs ={t: 'num', string: '1', v: 1};
      if(rhs.t === 'bool' && rhs.v === false) rhs ={t: 'num', string: '0', v: 0};
      if(lhs.t === 'str' && rhs.t === 'str' && config.allowStringComparison) return lhs.v > rhs.v;
      if(!isNumber(lhs.v) || !isNumber(rhs.v)) return false;
      return lhs.v > rhs.v;
    case '<=':
      if(rhs.t === 'arr' && rhs.v.length===0 && lhs.string && lhs.string.length>0) return false;
      if(lhs.t === 'arr' && lhs.v.length===0 && rhs.string && rhs.string.length>0) return false;
      if(rhs.t === 'bool' && rhs.v === false && lhs.t === 'arr' && lhs.v.length > 0) return false;
      if(lhs.t === 'bool') lhs = {t: 'num', v: lhs.v === true ? 1 : 0, string: lhs.v === true ? '1' : '0'};
      if(rhs.t === 'bool') rhs = {t: 'num', v: rhs.v === true ? 1 : 0, string: lhs.v === true ? '1' : '0'};

      if(lhs.t === 'arr' && lhs.v.length > 0) {
        for(var m=0;m<lhs.v.length;m++) {
          if(Number(lhs.v[m]) <= rhs.v) return true;
        }
        return false;
      }
      if(rhs.t === 'arr' && rhs.v.length > 0) {
        for(var p=0;p<rhs.v.length;p++) {
          if(lhs.v <= Number(rhs.v[p])) return true;
        }
        return false;
      }

      if(rhs.t === 'arr' && rhs.v.length===0) rhs ={t: 'num', string: '0', v: 0};
      if(lhs.t === 'arr' && lhs.v.length===0) lhs ={t: 'num', string: '0', v: 0};
      if(lhs.t === 'bool' && lhs.v === true) lhs ={t: 'num', string: '1', v: 1};
      if(lhs.t === 'bool' && lhs.v === false) lhs ={t: 'num', string: '0', v: 0};
      if(rhs.t === 'bool' && rhs.v === true) rhs ={t: 'num', string: '1', v: 1};
      if(rhs.t === 'bool' && rhs.v === false) rhs ={t: 'num', string: '0', v: 0};
      if(lhs.t === 'str' && rhs.t === 'str' && config.allowStringComparison) return lhs.v <= rhs.v;
      if(!isNumber(lhs.v) || !isNumber(rhs.v)) return false;
      return lhs.v <= rhs.v;
    case '>=':

      if(rhs.t === 'arr' && rhs.v.length===0 && lhs.string && lhs.string.length>0) return false;
      if(rhs.t === 'arr' && rhs.v.length > 0 && lhs.v === false) return false;
      if(lhs.t === 'arr' && lhs.v.length===0) {
        if(rhs.t === 'str' && rhs.v === '') return false;
        if(rhs.t === 'str') return rhs.v.length >= 0;
        return (rhs.v.length >= 0 || rhs.v === false);
      }

      if(lhs.t === 'bool') lhs = {t: 'num', v: lhs.v === true ? 1 : 0, string: lhs.v === true ? '1' : '0'};
      if(rhs.t === 'bool') rhs = {t: 'num', v: rhs.v === true ? 1 : 0, string: lhs.v === true ? '1' : '0'};

      if(lhs.t === 'arr' && lhs.v.length>0) {
        for(var q=0;q<lhs.v.length;q++) {
          if(Number(lhs.v[q]) >= rhs.v) return true;
        }
        return false;
      }

      if(rhs.t === 'arr' && rhs.v.length>0) {
        for(var r=0;r<rhs.v.length;r++) {
          if(lhs.v >= Number(rhs.v[r])) return true;
        }
        return false;
      }

      if(lhs.t === 'arr' && lhs.v.length===0) lhs ={t: 'num', string: '0', v: 0};
      if(lhs.t === 'bool' && lhs.v === true) lhs ={t: 'num', string: '1', v: 1};
      if(lhs.t === 'bool' && lhs.v === false) lhs ={t: 'num', string: '0', v: 0};
      if(rhs.t === 'arr' && rhs.v.length===0) rhs ={t: 'num', string: '0', v: 0};
      if(rhs.t === 'bool' && rhs.v === true) rhs ={t: 'num', string: '1', v: 1};
      if(rhs.t === 'bool' && rhs.v === false) rhs ={t: 'num', string: '0', v: 0};

      if(lhs.t === 'str' && rhs.t === 'str' && config.allowStringComparison) return lhs.v >= rhs.v;
      if(!isNumber(lhs.v) || !isNumber(rhs.v)) return false;
      return lhs.v >= rhs.v;

    case '!=':
      if(lhs.t === 'bool' && rhs.t === 'arr') {return lhs.v === rhs.v.length < 1;}
      if(rhs.t === 'bool' && lhs.t === 'arr') {return rhs.v === lhs.v.length < 1;}

      return lhs.v != rhs.v;
    case '&':  return Boolean(lhs.v && rhs.v);
    case '|':  return Boolean(lhs.v || rhs.v);
  }
}

module.exports = {
  handleOperation
};
