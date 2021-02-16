var fs = require('fs'),
    path = require('path'),
    Hgt = require('./hgt'),
    tileKey = require('./tile-key');

module.exports = function(tileDir, latLng, cb) {
    var ll = {
            lat: Math.floor(latLng.lat),
            lng: Math.floor(latLng.lng)
        },
        key = tileKey(ll),
        tilePath = path.join(tileDir, key + '.hgt');

    let exists = fs.existsSync(tilePath);
    var tile;
    if (exists) {
        setImmediate(function() {
            try {
                tile = new Hgt(tilePath, ll);
                cb(undefined, tile);
            } catch (e) {
                cb({message: 'Unable to load tile "' + tilePath + '": ' + e, stack: e.stack});
            }
        });
    } else if (this.options.downloader) {
        this.options.downloader.download(key, latLng, function(err) {
            if (!err) {
                cb(undefined, new Hgt(tilePath, ll));
            } else {
                cb(err);
            }
        });
    } else {
        setImmediate(function() {
            cb({message: 'Tile does not exist: ' + tilePath});
        });
    }
};
