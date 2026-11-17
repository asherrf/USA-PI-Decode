(function () {
    'use strict';
    if (window.location.pathname !== '/') return;

    const DATABASE_URL = '/pi-decode-database.csv';
    const REFRESH_MS = 5 * 60 * 1000;
    let database = null;
    let loading = true;

    function start() {
        const panel = document.createElement('div');
        panel.id = 'pi-decode-container';
        panel.className = 'panel-33 hover-brighten';
        panel.style.cssText = 'min-height:100px;height:auto;padding-bottom:8px;';
        panel.innerHTML = '<h2 style="margin:4px 0;font-size:1.3em">PI DECODE</h2><div id="pi-decode" style="font-size:0.8em;line-height:1.3;overflow-wrap:anywhere" aria-live="polite">Loading database…</div><hr class="hide-desktop">';
        const rt = document.getElementById('rt-container');
        if (rt && rt.parentNode) rt.parentNode.insertBefore(panel, rt.nextSibling);
        else document.body.appendChild(panel);
        const output = panel.querySelector('#pi-decode');

        function parseCSV(text) {
            const rows = []; let row = [], field = '', quoted = false;
            for (let i = 0; i < text.length; i++) {
                const c = text[i];
                if (c === '"') {
                    if (quoted && text[i + 1] === '"') { field += '"'; i++; }
                    else quoted = !quoted;
                } else if (c === ';' && !quoted) { row.push(field); field = ''; }
                else if ((c === '\n' || c === '\r') && !quoted) {
                    if (c === '\r' && text[i + 1] === '\n') i++;
                    row.push(field); rows.push(row); row = []; field = '';
                } else field += c;
            }
            if (field || row.length) { row.push(field); rows.push(row); }
            return rows;
        }
        function buildDatabase(text) {
            const index = new Map();
            for (const row of parseCSV(text.replace(/^\uFEFF/, ''))) {
                const [pi, frequency, callsign, state, city, owner, power] = row.map(value => value.trim());
                if (!/^\d+$/.test(pi || '') || !/^\d+$/.test(frequency || '') || !callsign) continue;
                const key = Number(pi) + ':' + Number(frequency);
                if (!index.has(key)) index.set(key, []);
                index.get(key).push({ frequency: Number(frequency), callsign, state, city, owner, power });
            }
            if (!index.size) throw new Error('No valid station records in database');
            return index;
        }
        function update() {
            if (!database) { output.textContent = loading ? 'Loading database…' : 'Database unavailable'; return; }
            const piText = (document.getElementById('data-pi')?.textContent || '').trim();
            const frequencyText = (document.getElementById('data-frequency')?.textContent || '').trim();
            const piMatch = piText.match(/^(?:0x)?([0-9a-f]{4})$/i);
            const freqMatch = frequencyText.match(/\d+(?:\.\d+)?/);
            const key = piMatch && freqMatch ? parseInt(piMatch[1], 16) + ':' + Math.round(Number(freqMatch[0]) * 100) : '';
            const stations = database.get(key);
            const fragment = document.createDocumentFragment();
            if (!stations) { output.textContent = 'No information available'; return; }
            for (const station of stations) {
                const entry = document.createElement('div');
                entry.style.margin = '3px 0';
                const title = document.createElement('div');
                title.style.fontWeight = 'bold';
                const location = [station.city, station.state].filter(Boolean).join(', ');
                title.textContent = [station.callsign, location].filter(Boolean).join(' ');
                const details = document.createElement('div');
                details.textContent = station.owner;
                entry.append(title, details); fragment.appendChild(entry);
            }
            output.replaceChildren(fragment);
        }
        async function refresh() {
            try {
                const response = await fetch(DATABASE_URL, { cache: 'no-cache' });
                if (!response.ok) throw new Error('HTTP ' + response.status);
                database = buildDatabase(await response.text());
            } catch (error) { console.error('PI Decode: database refresh failed', error); }
            loading = false; update();
            setTimeout(refresh, database ? REFRESH_MS : 15000);
        }
        refresh();
        setInterval(update, 1000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
