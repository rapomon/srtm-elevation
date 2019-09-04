const fs = require('fs');
const os = require('os');
const path = require('path');
const extend = require('extend');
const Promise = require('promise');
const request = require('request');
const yauzlPromise = require( 'yauzl-promise' );
const srtmDb = require( './srtm-db' );

function SRTMElevationDownloader(cacheDir, options) {
    this.options = extend({}, options);
    this._cacheDir = cacheDir;
    this._downloads = {};
}

SRTMElevationDownloader.prototype.download = async function(tileKey, latLng, cb) {
    var cleanup = function() {
            delete this._downloads[tileKey];
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }.bind(this);

    var download = this._downloads[tileKey];
    var zipfile, tempPath, stream;
    var url = this._getUrl(tileKey);

    if(url === null) {
        cb(undefined);
        return;
    }

    zipfile = url.substring(url.lastIndexOf('/') + 1);
    tempPath = path.join(os.tmpdir(), zipfile);
    stream = fs.createWriteStream(tempPath);

    if (!download) {
        try {
            this._downloads[tileKey] = await this._download(url, stream);
            await this._unzipSync(tempPath, this._cacheDir);
            cleanup();
            cb(undefined);
        } catch(err) {
            stream.end();
            cleanup();
            cb(err);
        };
    } else {
        cb(undefined);
    }
};

SRTMElevationDownloader.prototype._getUrl = function(tileKey) {
    const baseUrl = 'http://dds.cr.usgs.gov/srtm/version2_1/SRTM3';
    let url = null;
    for(let i = 0; i < srtmDb.length; i++) {
        let item = srtmDb[i];
        if(item.files.includes(tileKey)) {
            url = baseUrl + '/' + item.region + '/' + tileKey + '.hgt.zip';
            break;
        }
    }
    return url;
};

SRTMElevationDownloader.prototype._download = function(url, stream) {
    return new Promise(function(fulfill, reject) {
        request(url, function(err, response) {
            if (!err && response.statusCode === 200) {
                fulfill(stream);
            } else {
                // Second retry
                request(url, function(err, response) {
                    if (!err && response.statusCode === 200) {
                        fulfill(stream);
                    } else {
                        reject(err || response);
                    }
                }).pipe(stream);
            }
        }).pipe(stream);
    });
};

SRTMElevationDownloader.prototype._unzipSync = async function(zipPath, targetPath) {
    return new Promise(async function(fulfill, reject) {

        var unzips = [];

        if (!fs.existsSync(zipPath)) {
            fulfill();
            return;
        }

        // Create cache folder if it does not exist
        if (!fs.existsSync(targetPath)) {
            try {
                fs.mkdirSync(targetPath);
            } catch (err) {
                reject(err);
                return;
            }
        }

        try {
            const zipFile = await yauzlPromise.open(zipPath);
            const entries = await zipFile.readEntries();
            for(let e = 0; e < entries.length; e++) {
                let entry = entries[e];
                if (/\/$/.test(entry.fileName)) {
                    fulfill();
                    return;
                }

                var lastSlashIdx = entry.fileName.lastIndexOf('/'),
                fileName = entry.fileName.substr(lastSlashIdx + 1),
                filePath = path.join(targetPath, fileName);

                const readStream = await entry.openReadStream();

                unzips.push(new Promise(function(fulfill, reject) {
                    readStream.on('end', fulfill);
                    readStream.on('error', reject);
                }));

                readStream.pipe(fs.createWriteStream(filePath));
            }
            Promise.all(unzips)
            .then(function() {
                zipFile.close();
                fulfill();
            })
            .catch(reject);

        } catch (err) {
            reject(err);
        }
    });
};

module.exports = SRTMElevationDownloader;
