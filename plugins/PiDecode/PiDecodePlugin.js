document.addEventListener('DOMContentLoaded', function() {
    function createPiDecodeContainer() {
        let piDecodeContainer = document.getElementById('pi-decode-container');
        if (!piDecodeContainer) {
            piDecodeContainer = document.createElement('div');
            piDecodeContainer.id = 'pi-decode-container';
            piDecodeContainer.className = 'panel-33 hover-brighten';
            piDecodeContainer.style.height = '100px';
            piDecodeContainer.innerHTML = `
                <h2 style="margin-top: 4px;">PI DECODE</h2>
                <div id="pi-decode">
                    <span></span>
                </div>
                <hr class="hide-desktop">
            `;
            const rtContainer = document.getElementById('rt-container');
            if (rtContainer) {
                rtContainer.parentNode.insertBefore(piDecodeContainer, rtContainer.nextSibling);
            } else {
                document.body.appendChild(piDecodeContainer);
            }
        }
        return piDecodeContainer;
    }

    function hexToDecimal(hex) {
        return parseInt(hex, 16);
    }

    function loadDatabase(callback) {
        fetch('USA_PICODES.csv')
            .then(response => response.text())
            .then(data => {
                const lines = data.split('\n');
                const database = {};
                lines.forEach(line => {
                    const [piCode, frequency, station, state] = line.split(';');
                    if (piCode && frequency) {
                        if (!database[piCode]) {
                            database[piCode] = {};
                        }
                        database[piCode][frequency] = { station, state };
                    }
                });
                callback(database);
            })
            .catch(error => console.error('Error loading database:', error));
    }

    function updatePiDecode(database) {
        const piElement = document.getElementById('data-pi');
        const frequencyElement = document.getElementById('data-frequency');
        
        const piCodeHex = piElement ? piElement.textContent.trim() : '0000';
        const piCodeDecimal = hexToDecimal(piCodeHex).toString();
        const frequencyText = frequencyElement ? frequencyElement.textContent.trim() : 'Default Frequency';
        const frequency = frequencyText.match(/^\d+\.\d+/) ? (parseFloat(frequencyText) * 100).toFixed(0) : '00000';

        const piDecode = database[piCodeDecimal] ? database[piCodeDecimal][frequency] : null;
        const piDecodeElement = document.getElementById('pi-decode').querySelector('span');
        if (piDecode) {
            piDecodeElement.textContent = `${piDecode.station}, ${piDecode.state}`;
        } else {
            piDecodeElement.textContent = 'No information available';
        }
    }

    createPiDecodeContainer(); // Setup the PI decode panel

    loadDatabase(function(database) {
        updatePiDecode(database); // Populate the PI decode info initially
        setInterval(function() {
            updatePiDecode(database);
        }, 1000); // Update info every 1000 ms
    });
});
