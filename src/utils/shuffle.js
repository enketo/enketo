var MAX_INT32 = 2147483647;
var MINSTD = 16807;

/**
 * Performs the "inside-out" variant of the Fisher-Yates array shuffle.
 *
 * @see https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_%22inside-out%22_algorithm
 *
 * @param  {<*>}        array the array to shuffle
 * @param  {number=}    seed the seed value
 * @return {<*>}        the suffled array
 */
function shuffle(array, seed) {
  var rng;
  var result = [];

  if(typeof seed !== 'undefined'){
    if(!Number.isInteger(seed)) {
      throw new Error('Invalid seed argument. Integer required, but got: ' + seed);
    }
    var rnd = new Random(seed);
    rng = rnd.nextFloat.bind(rnd);
  } else {
    rng = Math.random;
  }

  for (var i = 0; i < array.length; ++i) {
    var j = Math.floor(rng() * (i + 1));
    if(j !== i) {
      result[i] = result[j];
    }
    result[j] = array[i];
  }
  return result;
}

/**
 * Creates a the Park-Miller PRNG pseudo-random value generator.
 * The seed must be an integer.
 *
 * Adapted from: https://gist.github.com/blixt/f17b47c62508be59987b
 */
function Random(seed) {
    this._seed = seed % MAX_INT32;
  if(this._seed <= 0) {
    this._seed += (MAX_INT32 - 1);
  }
}

/**
 * Returns a pseudo-random integer value.
 */
Random.prototype.next = function () {
  this._seed = this._seed * MINSTD % MAX_INT32;
  return this._seed;
};

/**
 * Returns a pseudo-random floating point number in range [0, 1).
 */
Random.prototype.nextFloat = function () {
    // We know that result of next() will be 1 to 2147483646 (inclusive).
    return (this.next() - 1) / (MAX_INT32 - 1);
};

module.exports = shuffle;
