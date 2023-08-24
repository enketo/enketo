/* **************
The only purpose of this script is to be used by the npm test script to write the shield badge within the README.md file
************** */

var fs = require('fs');
var path = require('path');
var istanbul = require('istanbul');
var collector = new istanbul.Collector();
var Report = istanbul.Report;
var shieldBadgeReporter = require('istanbul-reporter-shield-badge');

istanbul.Report.register(shieldBadgeReporter);

var report = Report.create('shield-badge', {
    readmeFilename: 'README.md',
    readmeDir: path.resolve(__dirname, '.'),
    subject: 'coverage',
});

try {
    console.log(
        '\n====================== Adding the badge to the ' +
            report.readmeFilename +
            ' ======================='
    );
    var coverageDir = path.resolve(__dirname, 'test-coverage');
    fs.readdirSync(coverageDir).forEach(function (file) {
        if (file.indexOf('cov') === 0 && file.indexOf('.json') > 0) {
            collector.add(
                JSON.parse(
                    fs.readFileSync(path.resolve(coverageDir, file), 'utf8')
                )
            );
        }
    });
    report.on('done', function () {
        console.log('The istanbul shield badge report has been generated');
    });
    report.writeReport(collector, true);
} catch (err) {
    console.error(err.message);
    process.exit(1);
}
