const { assertString } = require('../helpers');

  describe('#today()', () => {
    it('should return today\'s date', () => {
      // given
      var today = new Date(),
          zeroPad = function(n) { return n >= 10 ? n : '0' + n; };
      today = today.getFullYear() + '-' + zeroPad(today.getMonth()+1) + '-' +
          zeroPad(today.getDate());

      // expect
      assertString('today()', today);
    });
  });
