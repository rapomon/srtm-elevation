const requestPromise = require('request-promise');
const fs = require('fs');

const filelist = [
    { region: 'Africa', files: [] },
    { region: 'Australia', files: [] },
    { region: 'Eurasia', files: [] },
    { region: 'Islands', files: [] },
    { region: 'North_America', files: [] },
    { region: 'South_America', files: [] }
];

const baseUrl = 'http://dds.cr.usgs.gov/srtm/version2_1/SRTM3/';

async function initBuild() {
    let timestampBegin = process.hrtime();
    let timestampEnd;

    // Retrieve files from each region
    for(let r = 0; r < filelist.length; r++) {
        let item = filelist[r];
        try {
            process.stdout.write('\nGet links from ' + baseUrl + item.region + ' ... ');
            let res = await requestPromise({ uri: baseUrl + item.region, resolveWithFullResponse: true });
            process.stdout.write(''+res.statusCode);
            if(res.statusCode === 200) {
                process.stdout.write(' OK');
                let html = res.body;
                let results = html.match(/href=\"(.*?)\"/gi);
                for(let i = 0; i < results.length; i++) {
                    let result = results[i];
                    let ini = 'href=\"'.length;
                    let end = result.indexOf('.hgt');
                    if(end === -1) continue;
                    let file = result.substring(ini, end);
                    item.files.push(file);
                }
            } else {
                process.stdout.write(' ERROR');
            }
        } catch(err) {
            process.stdout.write(' FATAL ERROR');
            console.error(err);
        }
    }

    // Write file
    let result = 'module.exports = ' + JSON.stringify(filelist, null, 4) + ';';
    let filename = 'srtm-db.js';
    process.stdout.write('\nGenerating file ./src/'+filename+' ... ');
    fs.writeFileSync('./src/'+filename, result);
    process.stdout.write('OK');

    timestampEnd = process.hrtime();

    process.stdout.write('\nSRTM DB generated in ' + (timestampEnd[0] - timestampBegin[0]) + 's ' + (Math.abs(timestampEnd[1] - timestampBegin[1]) / 1000000) + 'ms\n');
}

initBuild();