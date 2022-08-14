const fs = require('fs');
const path = require('path');
var extend = require('extend'),
    SRTMElevationDownloader = require('./srtm'),
    loadTile = require('./load-tile'),
    _latLng = require('./latlng'),
    tileKey = require('./tile-key');

function range(start, end) {
    var a = Array.apply(0, new Array(end - start + 1));
    a.forEach(function(e, i) { a[i] = start + i; });
    return a;
}

function flatten(a) {
    return [].concat.apply([], a);
}

function SyncTileSet(tileDir, sw, ne, cb, options) {
    this.options = extend({}, {
        loadTile: loadTile,
        downloader: new SRTMElevationDownloader(tileDir, options),
        pad: 0
    }, options);
    this._tileDir = tileDir;

    let pad = this.options.pad,
        south = Math.floor(sw[0]) - pad,
        north = Math.floor(ne[0]) + 1 + pad,
        west = Math.floor(sw[1]) - pad,
        east = Math.floor(ne[1]) + 1 + pad;

    this._tiles = new Array(north - south);
    this._south = south;
    this._west = west;
    this._north = north;
    this._east = east;

    let rangeSN = range(south, north - 1);
    let rangeWE = range(west, east - 1);

    let firstTileKey = null;
    let allTilesCached = true;
    for(let i = 0; i < rangeSN.length; i++) {
        if(!allTilesCached) break;
        for(let j = 0; j < rangeWE.length; j++) {
            if(!allTilesCached) break;
            let latLng = new _latLng([rangeSN[i], rangeWE[j]]);
            let key = tileKey({
                lat: Math.floor(latLng.lat),
                lng: Math.floor(latLng.lng)
            });
            if(!this.options.downloader._getUrl(key)) continue;
            if(!firstTileKey) firstTileKey = key;
            let tilePath = path.join(this._tileDir, key + '.hgt');
            if(!fs.existsSync(tilePath)) {
                allTilesCached = false;
            }
        }
    }

    let afterInit = (err) => {
        if(err) {
            return setImmediate(function() {
                cb(err);
            });
        }
        let _loadTile = this.options.loadTile.bind(this);
        let _this = this;
        let tasks = flatten(rangeSN.map(function(lat, i) {
            this._tiles[i] = new Array(east - west);
            return rangeWE.map(function(lng, j) {
                return function() {
                    _loadTile(this._tileDir, new _latLng([lat, lng]), function(err, t) {
                        if (err) {
                            return setImmediate(function() {
                                taskCb(err);
                            });
                        }
                        this._tiles[i][j] = t;
                        setImmediate(taskCb);
                    }.bind(_this));
                }.bind(_this);
            });
        }.bind(_this)));
        let wait = tasks.length;
        let taskCb = function(err) {
            if (wait < 0) return;

            if (err) {
                wait = -1;
                return setImmediate(function() {
                    cb(err);
                });
            }

            wait--;
            if (wait === 0) {
                setImmediate(function() {
                    cb();
                });
            }
        };

        tasks.forEach(function(t) { t(); });
    };

    if(allTilesCached) {
        afterInit();
    } else {
        this.options.downloader.init(firstTileKey, afterInit);
    }
}

SyncTileSet.prototype.getElevation = function(ll) {
    var tileLat = Math.floor(ll[0]),
        tileLng = Math.floor(ll[1]),
        tile;

    if (tileLat < this._south || tileLat >= this._north ||
        tileLng < this._west || tileLng >= this._east) {
        throw new Error('Coordinate is outside tileset\'s bounds: ' + ll);
    }

    tile = this._tiles[tileLat - this._south][tileLng - this._west];
    return tile.getElevation(ll);
};

SyncTileSet.prototype.destroy = function() {
    this._tiles.forEach(function(arr) {
        arr.forEach(function(t) {
            t.destroy();
        });
    });
};

module.exports = SyncTileSet;
