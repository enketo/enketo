// see: https://github.com/ryanclark/karma-webpack#alternative-usage

// require all modules ending in ".spec" from the
// current directory and all subdirectories
const testsContext = require.context('.', true, /.spec$/);

testsContext.keys().forEach(testsContext);
