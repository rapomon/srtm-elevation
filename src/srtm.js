const fs = require('fs');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const extend = require('extend');
const Promise = require('promise');
const fetch = require('node-fetch');
const yauzlPromise = require( 'yauzl-promise' );
const srtmDb = require( './srtm-db' );

function SRTMElevationDownloader(cacheDir, options = {}) {
    this.options = extend({
        // Earthdata Login credentials. If you do not have a Earthdata Login, create one at https://urs.earthdata.nasa.gov//users/new"
        provider: 'https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL3.003/2000.02.11/',
        username: null, // Required username
        password: null  // Required password
    }, options);
    this._cacheDir = cacheDir;
    this._downloads = {};
}

SRTMElevationDownloader.prototype.init = async function(tileKey, cb) {
    var url = this._getUrl(tileKey);

    if(url === null) {
        cb(undefined);
        return;
    }

    if(this.options.username && this.options.password && !this.options._cookie) {
        const auth = "Basic " + Buffer.from(this.options.username + ":" + this.options.password).toString("base64");

        let res = await fetch(url, {
            headers : {
                "Authorization" : auth
            },
            redirect: 'manual'
        });
    
        const authorizeUrl = res.headers.raw()['location'];
        if(!authorizeUrl) {
            cb(undefined);
            return;
        }

        res = await fetch(authorizeUrl, {
            headers : {
                "Authorization" : auth
            },
            redirect: 'manual'
        });
    
        const oauthUrl = res.headers.raw()['location'];

        if(!oauthUrl) {
            cb(undefined);
            return;
        }

        res = await fetch(oauthUrl, {
            redirect: 'manual'
        });
    
        this.options._cookie = res.headers.raw()['set-cookie'];
    }

    cb(undefined);
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
    let url = null;
    if(srtmDb.includes(tileKey)) {
        url = this.options.provider + (!this.options.provider.endsWith('/') ? '/' : '') + tileKey + '.SRTMGL3.hgt.zip';
    }
    return url;
};

SRTMElevationDownloader.prototype._download = function(url, stream) {
    let _this = this;
    return new Promise(async function(fulfill, reject) {
        const streamPipeline = promisify(pipeline);
        let _options = {};
        if(_this.options._cookie) {
            _options.headers = {
                'Cookie': _this.options._cookie
            };
        }
        let response;
        try {
            response = await fetch(url, _options);
            if(response.status === 200) {
                await streamPipeline(response.body, stream);
                fulfill(stream);
            }
        } catch(err) {
            try {
                // Second retry
                response = await fetch(url, _options);
                if(response.status === 200) {
                    await streamPipeline(response.body, stream);
                    fulfill(stream);
                }
            } catch(err) {
                reject(err || response.headers['www-authenticate'] || response);
            }
        }
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