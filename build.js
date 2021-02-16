const fetch = require('node-fetch');
const fs = require('fs');

async function initBuild() {
    let timestampBegin = process.hrtime();
    let timestampEnd;

    const baseUrl = 'https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL3.003/2000.02.11/';

    let files = [];
    try {
        let res = await fetch(baseUrl);
        if(res.status === 200) {
            const regex = /href=\"(.*?)\"/gi;
            let html = await res.text();
            let matches = html.match(regex);
            // Retrieve files from each page
            for(let i = 0; i < matches.length; i++) {
                let match = matches[i];
                let ini = 'href=\"'.length;
                let end = match.indexOf('\"', ini);
                if(end === -1) continue;
                let pageUrl = match.substring(ini, end);
                if(pageUrl.startsWith(baseUrl)) {
                    process.stdout.write(`\nGet links from ${pageUrl} ... `);
                    let pageRes = await fetch(pageUrl);
                    if(pageRes.status === 200) {
                        process.stdout.write('OK');
                        process.stdout.write('\nParsing HTML ... ');
                        let pageHtml = await pageRes.text();
                        let pageMatches = pageHtml.match(regex);
                        let fileCount = 0;
                        for(let j = 0; j < pageMatches.length; j++) {
                            let pageMatch = pageMatches[j];
                            let ini = 'href=\"'.length;
                            let end = pageMatch.indexOf('.SRTMGL3.hgt.zip\"', ini);
                            if(end === -1) continue;
                            let fileUrl = pageMatch.substring(ini, end);
                            const file = fileUrl.replace('http://', 'https://').replace(baseUrl, '');
                            files.push(file);
                            fileCount++;
                        }
                        process.stdout.write(`${fileCount} files found`);
                    }
                }
            }
        }
    } catch(err) {
        process.stdout.write(' FATAL ERROR');
        console.error(err);
        return;
    }

    // Write file
    let result = 'module.exports = ' + JSON.stringify(files, null, 4) + ';';
    let filename = 'srtm-db.js';
    process.stdout.write('\nGenerating file ./src/'+filename+' ... ');
    fs.writeFileSync('./src/'+filename, result);
    process.stdout.write('OK');

    timestampEnd = process.hrtime();

    process.stdout.write('\nSRTM DB generated in ' + (timestampEnd[0] - timestampBegin[0]) + 's ' + (Math.abs(timestampEnd[1] - timestampBegin[1]) / 1000000) + 'ms\n');
}

initBuild();