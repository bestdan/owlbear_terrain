import OBR from "@owlbear-rodeo/sdk";

// Initialize the Owlbear Rodeo SDK
let selectedTerrainType = null;
let terrainAreas = [];

// Wait for the SDK to be ready
OBR.onReady(async () => {
    console.log("Owlbear Terrain extension loaded");
    
    // Set up event listeners
    setupEventListeners();
    
    // Load existing terrain areas
    await loadTerrainAreas();
});

function setupEventListeners() {
    // Terrain type selection
    const terrainButtons = document.querySelectorAll('.terrain-btn');
    terrainButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            terrainButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            selectedTerrainType = btn.dataset.type;
            showTerrainSettings(selectedTerrainType);
        });
    });

    // Apply terrain button
    const applyBtn = document.getElementById('applyTerrain');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyTerrain);
    }
}

function showTerrainSettings(type) {
    const settingsSection = document.getElementById('terrainSettings');
    const settingsContent = document.getElementById('settingsContent');
    
    settingsSection.style.display = 'block';
    
    // Generate settings based on terrain type
    let settingsHTML = '';
    
    switch(type) {
        case 'altitude':
            settingsHTML = `
                <div class="settings-group">
                    <label>Height Level</label>
                    <input type="number" id="heightLevel" value="0" step="5" />
                </div>
                <div class="settings-group">
                    <label>Name (optional)</label>
                    <input type="text" id="terrainName" placeholder="e.g., Hill, Mountain" />
                </div>
            `;
            break;
        case 'difficult':
            settingsHTML = `
                <div class="settings-group">
                    <label>Movement Multiplier</label>
                    <input type="number" id="movementMultiplier" value="0.5" step="0.1" min="0.1" max="1" />
                </div>
                <div class="settings-group">
                    <label>Name (optional)</label>
                    <input type="text" id="terrainName" placeholder="e.g., Forest, Rubble" />
                </div>
            `;
            break;
        case 'speedy':
            settingsHTML = `
                <div class="settings-group">
                    <label>Movement Multiplier</label>
                    <input type="number" id="movementMultiplier" value="2" step="0.1" min="1" max="5" />
                </div>
                <div class="settings-group">
                    <label>Name (optional)</label>
                    <input type="text" id="terrainName" placeholder="e.g., Road, Ice" />
                </div>
            `;
            break;
        case 'current':
            settingsHTML = `
                <div class="settings-group">
                    <label>Direction (degrees)</label>
                    <input type="number" id="direction" value="0" min="0" max="360" />
                </div>
                <div class="settings-group">
                    <label>Force (feet per round)</label>
                    <input type="number" id="force" value="10" step="5" />
                </div>
                <div class="settings-group">
                    <label>Name (optional)</label>
                    <input type="text" id="terrainName" placeholder="e.g., Water Current, Wind" />
                </div>
            `;
            break;
        case 'hazard':
            settingsHTML = `
                <div class="settings-group">
                    <label>Effect Type</label>
                    <select id="effectType">
                        <option value="damage">Damage</option>
                        <option value="save">Saving Throw</option>
                        <option value="condition">Condition</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label>Description</label>
                    <input type="text" id="effectDescription" placeholder="e.g., 1d6 fire damage" />
                </div>
                <div class="settings-group">
                    <label>Name (optional)</label>
                    <input type="text" id="terrainName" placeholder="e.g., Lava, Thorns" />
                </div>
            `;
            break;
    }
    
    settingsContent.innerHTML = settingsHTML;
}

async function applyTerrain() {
    if (!selectedTerrainType) {
        alert('Please select a terrain type first');
        return;
    }

    // Get terrain name
    const nameInput = document.getElementById('terrainName');
    const terrainName = nameInput ? nameInput.value || `${selectedTerrainType} terrain` : `${selectedTerrainType} terrain`;

    // Collect settings based on terrain type
    const terrainData = {
        type: selectedTerrainType,
        name: terrainName,
        timestamp: Date.now()
    };

    switch(selectedTerrainType) {
        case 'altitude':
            terrainData.heightLevel = parseInt(document.getElementById('heightLevel')?.value || 0);
            break;
        case 'difficult':
        case 'speedy':
            terrainData.movementMultiplier = parseFloat(document.getElementById('movementMultiplier')?.value || 1);
            break;
        case 'current':
            terrainData.direction = parseInt(document.getElementById('direction')?.value || 0);
            terrainData.force = parseInt(document.getElementById('force')?.value || 10);
            break;
        case 'hazard':
            terrainData.effectType = document.getElementById('effectType')?.value || 'damage';
            terrainData.effectDescription = document.getElementById('effectDescription')?.value || '';
            break;
    }

    // Add to terrain areas
    terrainAreas.push(terrainData);
    
    // Save to OBR metadata
    await saveTerrainAreas();
    
    // Update UI
    updateTerrainList();
    
    // Show feedback
    console.log('Terrain applied:', terrainData);
}

async function loadTerrainAreas() {
    try {
        // Load terrain data from OBR scene metadata
        const metadata = await OBR.scene.getMetadata();
        if (metadata['owlbear-terrain/areas']) {
            terrainAreas = metadata['owlbear-terrain/areas'];
            updateTerrainList();
        }
    } catch (error) {
        console.error('Error loading terrain areas:', error);
    }
}

async function saveTerrainAreas() {
    try {
        // Save terrain data to OBR scene metadata
        await OBR.scene.setMetadata({
            'owlbear-terrain/areas': terrainAreas
        });
    } catch (error) {
        console.error('Error saving terrain areas:', error);
    }
}

function updateTerrainList() {
    const listContainer = document.getElementById('activeTerrainList');
    
    if (terrainAreas.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">No active terrain areas</p>';
        return;
    }
    
    let html = '';
    terrainAreas.forEach((terrain, index) => {
        const details = getTerrainDetails(terrain);
        html += `
            <div class="terrain-item">
                <div class="terrain-item-info">
                    <div class="terrain-item-name">${terrain.name}</div>
                    <div class="terrain-item-details">${details}</div>
                </div>
                <button class="terrain-item-remove" onclick="removeTerrain(${index})">Remove</button>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
}

function getTerrainDetails(terrain) {
    switch(terrain.type) {
        case 'altitude':
            return `Height: ${terrain.heightLevel}ft`;
        case 'difficult':
            return `Movement: ${terrain.movementMultiplier}x`;
        case 'speedy':
            return `Movement: ${terrain.movementMultiplier}x`;
        case 'current':
            return `Direction: ${terrain.direction}°, Force: ${terrain.force}ft`;
        case 'hazard':
            return `${terrain.effectType}: ${terrain.effectDescription}`;
        default:
            return '';
    }
}

// Make removeTerrain available globally for onclick handlers
window.removeTerrain = async function(index) {
    terrainAreas.splice(index, 1);
    await saveTerrainAreas();
    updateTerrainList();
};
