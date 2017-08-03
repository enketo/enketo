// Karma configuration
// Generated on Mon Jul 13 2015 15:18:38 GMT+0200 (CEST)

module.exports = function(config) {
  var cfg = {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    plugins: ['karma-mocha', 'karma-requirejs', 'karma-chai', 'karma-firefox-launcher'],


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'requirejs', 'chai'],


    // list of files / patterns to load in the browser
    files: [
      'test-main.js',
      {pattern: 'src/**/*.js', included: false},
      {pattern: 'test/**/*.js', included: false},
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Firefox'],

    customLaunchers: {
      Chrome_travis_ci: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  }

  if (process.env.TRAVIS) cfg.browsers = ['Chrome_travis_ci'];

  config.set(cfg);
}
