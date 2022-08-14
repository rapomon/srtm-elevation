var test = require('tape'),
    SRTMElevationDownloader = require('../').SRTMElevationDownloader;

test('can download file', function(t) {
    // Don't run this test by default
    if (!process.env.RUN_ALL_TESTS) {
        return t.end();
    }

    var dler = new SRTMElevationDownloader(__dirname + '/data/');
    dler.init('N57E011', function() {
        dler.download('N57E011', [57.7, 11.9], function(err) {
            if (!err) {
                t.pass('file was downloaded successfully.');
            } else {
                t.fail(err);
            }
            t.end();
        });
    });
});

test('can handle multiple parallel downloads', function(t) {
    // Don't run this test by default
    if (!process.env.RUN_ALL_TESTS) {
        return t.end();
    }

    var dler = new SRTMElevationDownloader(__dirname + '/data/');

    t.plan(10);
    dler.init('N57E011', function() {
        for (var i = 0; i < 10; i++) {
            dler.download('N57E011', [57.7, 11.9], function(err) {
                if (!err) {
                    t.pass('file was downloaded successfully.');
                } else {
                    t.fail(err);
                }
            });
        }
    });
});
