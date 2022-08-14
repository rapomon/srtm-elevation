srtm-elevation
==============

This node module is based on [node-hgt](https://github.com/perliedman/node-hgt) so thank you perliedman!

This module read and query HGT files after cache them from the provider specified, for elevation data with high performance.

## Usage

```js
const tileset = new SyncTileSet('./data/', [57, 11], [58, 12], function(err) {
    ...
}, options);
```
## Default options
```js

{
  provider: "https://srtm.fasma.org/{lat}{lng}.SRTMGL3S.hgt.zip",
  username: null,
  password: null
}
```
The ``provider`` option it's the url where the library will get the HGT files compressed in ZIP format. The url supports two dynamic values, ``{lat}`` and ``{lng}`` matching the Latitude/Longitude needed to get elevations of coordinates inside the specified bounds.

The default value is https://srtm.fasma.org/{lat}{lng}.SRTMGL3S.hgt.zip but you can specify other providers such as:

#### Bailu
```http
https://bailu.ch/dem3/{lat}/{lat}{lng}.hgt.zip
```

#### Nasa (EarthData)
```http
https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL3.003/2000.02.11/{lat}{lng}.SRTMGL3.hgt.zip
```
  
Since January 2021, you must authenticate in order to access the EarthData NASA elevation data.

So in this case, we must specify two more options, ``username`` and ``password``.

From mid-2022 this server is down frecuently so it's not recommended, anyway if you want to use it, you will need Earthdata Login credentials. If you do not have a Earthdata Login, create one at https://urs.earthdata.nasa.gov//users/new"

After activate the account you must specify your username and password when you instantiate the class `SyncTileSet` by this way:

```js
const tileset = new SyncTileSet('./data/', [57, 11], [58, 12], function(err) {
  ...
}, {
  provider: "https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL3.003/2000.02.11/{lat}{lng}.SRTMGL3.hgt.zip",
  username: "XXX", // Earthdata username
  password: "XXX", // Earthdata password
});
```

## Install

```bash
npm install --save srtm-elevation
```

## Usage

Load and query a HGT file:

```js
const hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11]);

// Return elevation in meters above sea level.
// By default, elevation is interpolated bilinearly.
hgt.getElevation([57, 11]);
```

Use a cache directory of HGT files for querying. Missing data will be downloaded
using the elevation data from the provider specified:

```js
const tileset = new TileSet('./data/');
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
const tileset = new SyncTileSet('./data/', [57, 11], [58, 12], function(err) {
  if (err) {
    console.log(err);
    return;
  }

  // All tiles are loaded (or downloaded, if they were not already on disk)
  // and queries can be made synchronous.

  const elevation = tileset.getElevation([57.7, 11.9]);
  console.log(elevation);
});
```

## Full example

In this example, we have an array of locations with a route from Madrid to Paris. We determine the bounds by calculating the minimum and maximum latitude and longitude. The SyncTileSet function will retrieve the necessary hgt files from the NASA's server and will cache it. In the callback we calculate the elevation of each point.

The first call will take longer because we have to download and unzip the .hgt.zip files, the following calls will be faster because the files have been cached.

```js
const SyncTileSet = require('./src').SyncTileSet;

// From Madrid to Paris [ latitude, longitude ]
const locations = [
  [ 40.396764305572056, -3.7408447265625004  ],
  [ 44.465151013519645,  2.2467041015625004  ],
  [ 43.23319741022136 , -2.9278564453125     ],
  [ 43.337164854911094, -1.4337158203125     ],
  [ 44.84418558537004 , -0.6207275390625001  ],
  [ 46.5739667965278  ,  0.36254882812500006 ],
  [ 47.87214396888731 ,  1.9006347656250002  ],
  [ 48.850258199721495,  2.3291015625000004  ]
];

// Calculate bounds (min and max values from lats/lngs)
const lats = locations.map(l => l[0]);
const lngs = locations.map(l => l[1]);
const minLat = Math.min.apply(null, lats);
const maxLat = Math.max.apply(null, lats);
const minLng = Math.min.apply(null, lngs);
const maxLng = Math.max.apply(null, lngs);

const tileset = new SyncTileSet('./data/', [minLat, minLng], [maxLat, maxLng], function(err) {
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
