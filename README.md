srtm-elevation
==============

This node module is based in [node-hgt](https://github.com/perliedman/node-hgt) so thank you perliedman!

This module read and query HGT files after cache them from NASA's server, for elevation data with high performance.


## Install

```
npm install --save srtm-elevation
```

## Usage

Load and query a HGT file:

```js
    var hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11]);
    
    // Return elevation in meters above sea level.
    // By default, elevation is interpolated bilinearly.
    hgt.getElevation([57, 11])
```

Use a cache directory of HGT files for querying. Missing data will be downloaded
using the elevation data from [NASA's server](http://dds.cr.usgs.gov/srtm/),
by default.

```js
    var tileset = new TileSet('./data/');
    tileset.getElevation([57.7, 11.9], function(err, elevation) {
        if (err) {
            console.log('getElevation failed: ' + err.message);
        } else {
            console.log(elevation);
        }
    });
```

There's also a synchronous tile set, if you know before hand which area you will query:

```js
    var tileset = new SyncTileSet('./data/', [57, 11], [58, 12], function(err) {
        if (err) {
            console.log(err);
            return;
        }

        // All tiles are loaded (or downloaded, if they were not already on disk)
        // and queries can be made synchronous.

        var elevation = tileset.getElevation([57.7, 11.9]);
                console.log(elevation);
            }
        });
    });
```
