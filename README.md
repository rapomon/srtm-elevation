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
    });
```

## Full example

In this example, we have an array of locations with a route from Madrid to Paris. We determine the bounds by calculating the minimum and maximum latitude and longitude. The SyncTileSet function will retrieve the necessary hgt files from the NASA's server and will cache it. In the callback we calculate the elevation of each point.

The first call will take longer because we have to download and unzip the .hgt.zip files, the following calls will be faster because the files have been cached.

```js
    var SyncTileSet = require('./src').SyncTileSet;

    // From Madrid to Paris [ latitude, longitude ]
    let locations = [
        [ 40.396764305572056, -3.7408447265625004  ],
        [ 44.465151013519645,  2.2467041015625004  ],
        [ 43.23319741022136 , -2.9278564453125     ],
        [ 43.337164854911094, -1.4337158203125     ],
        [ 44.84418558537004 , -0.6207275390625001  ],
        [ 46.5739667965278  ,  0.36254882812500006 ],
        [ 47.87214396888731 ,  1.9006347656250002  ],
        [ 48.850258199721495,  2.3291015625000004  ]
    ];

    // Calculate min and max lats/lngs
    let lats = locations.map(l => l[0]);
    let lngs = locations.map(l => l[1]);
    let minLat = Math.min.apply(null, lats);
    let maxLat = Math.max.apply(null, lats);
    let minLng = Math.min.apply(null, lngs);
    let maxLng = Math.max.apply(null, lngs);

    var tileset = new SyncTileSet('./data/', [minLat, minLng], [maxLat, maxLng], function(err) {
        if (err) {
            console.log(err);
            return;
        }

        // All tiles are loaded (or downloaded, if they were not already on disk)
        // and queries can be made synchronous.
        locations.forEach(l => {
            console.log(tileset.getElevation([l[0], l[1]]));
        });
    });
```
