const fs = require('fs');
const path = require('path');
const https = require('https');

var pluginConfig = {
    name: 'PI Decode',
    version: '2.1',
    author: '.asherr',
    frontEndPath: 'PiDecode/PiDecodePlugin.js'
};

const root = path.dirname(require.main.filename);
const cacheFile = path.join(root, 'web', 'pi-decode-database.csv');
const attemptFile = path.join(root, 'plugins', 'PiDecode', 'last-download.txt');
const interval = 4 * 60 * 60 * 1000;
const url = 'https://raw.githubusercontent.com/asherrf/PI-Database/refs/heads/main/RDS_DATABASE.csv';

function refresh() {
    let lastAttempt = 0;
    try { lastAttempt = Number(fs.readFileSync(attemptFile, 'utf8')) || 0; } catch (_) {}
    const remaining = interval - (Date.now() - lastAttempt);
    if (remaining > 0) { setTimeout(refresh, remaining); return; }
    try { fs.writeFileSync(attemptFile, String(Date.now())); }
    catch (error) { console.error('PI Decode: cannot save download time:', error.message); setTimeout(refresh, interval); return; }
    const request = https.get(url, { timeout: 30000 }, response => {
        if (response.statusCode !== 200) {
            console.error('PI Decode: database download returned HTTP ' + response.statusCode);
            response.resume(); return;
        }
        const chunks = []; let size = 0;
        response.on('data', chunk => {
            size += chunk.length;
            if (size > 10 * 1024 * 1024) { response.destroy(new Error('Database too large')); return; }
            chunks.push(chunk);
        });
        response.on('error', error => console.error('PI Decode: download failed:', error.message));
        response.on('end', () => {
            const data = Buffer.concat(chunks);
            if (!/^\d+;\d+;/m.test(data.toString('utf8'))) { console.error('PI Decode: invalid database'); return; }
            try {
                fs.writeFileSync(cacheFile + '.tmp', data);
                fs.renameSync(cacheFile + '.tmp', cacheFile);
            } catch (error) { console.error('PI Decode: cannot save database:', error.message); }
        });
    });
    request.on('timeout', () => request.destroy(new Error('Download timed out')));
    request.on('error', error => console.error('PI Decode: download failed:', error.message));
    setTimeout(refresh, interval);
}
refresh();
module.exports = { pluginConfig };
