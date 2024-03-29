function _random13chars() {
    return Math.random().toString(16).substring(2);
}

function randomToken(length) {
    const loops = Math.ceil(length / 13);
    return new Array(loops)
        .fill(_random13chars)
        .reduce((string, func) => string + func(), '')
        .substring(0, length);
}

module.exports = {
    randomToken,
};
