import OBR, { Item } from "@owlbear-rodeo/sdk";
import { GridInfo } from "../services/gridService";
import { TerrainData, getTerrainDetails, loadTerrainAreas, removeTerrainItem } from "../services/terrainService";

export function updateTerrainList(terrainItems: Item[], gridInfo: GridInfo | null) {
    const listContainer = document.getElementById('activeTerrainList');
    if (!listContainer) return;

    if (!terrainItems || terrainItems.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">No active terrain areas</p>';
        return;
    }

    let html = '';
    terrainItems.forEach((item) => {
        const terrainData = item.metadata['owlbear-terrain/data'] as any;
        const gridSize = item.metadata['owlbear-terrain/gridSize'] as any;
        const cellCount = item.metadata['owlbear-terrain/cellCount'];
        const details = getTerrainDetails(terrainData, gridSize, cellCount, gridInfo);
        html += `
            <div class="terrain-item">
                <div class="terrain-item-info">
                    <div class="terrain-item-name">${item.name}</div>
                    <div class="terrain-item-details">${details}</div>
                </div>
                <button class="terrain-item-remove" data-item-id="${item.id}">Remove</button>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // Attach event listeners to remove buttons
    const removeButtons = listContainer.querySelectorAll<HTMLButtonElement>('.terrain-item-remove');
    removeButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const itemId = button.dataset.itemId;
            if (itemId) {
                await removeTerrainItem(itemId);
                const terrainItems = await loadTerrainAreas();
                updateTerrainList(terrainItems, gridInfo);
            }
        });
    });
}

export function setupTerrainRemovalHandler() {
    // This function is now empty as event handlers are set up directly in updateTerrainList
    // Kept for API compatibility
}

export function showTerrainSettings(type: string, gridInfo: GridInfo | null) {
    console.log('Showing settings for:', type);
    const settingsSection = document.getElementById('terrainSettings');
    const settingsContent = document.getElementById('settingsContent');

    if (!settingsSection || !settingsContent) {
        console.error('Settings elements not found');
        return;
    }

    settingsSection.style.display = 'block';

    // Generate settings based on terrain type
    let settingsHTML = '';

    switch (type) {
        case 'altitude':
            settingsHTML = `
                <div class="settings-group">
                    <label>Height Level (${gridInfo?.scale?.unit || 'ft'})</label>
                    <input type="number" id="heightLevel" value="20" step="${gridInfo?.scale?.multiplier || 5}" />
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
                    <small class="field-hint">0.5 = half speed, 0.25 = quarter speed</small>
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
                    <small class="field-hint">2.0 = double speed, 1.5 = 50% faster</small>
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
                    <small class="field-hint">0° = right, 90° = down, 180° = left, 270° = up</small>
                </div>
                <div class="settings-group">
                    <label>Force (${gridInfo?.scale?.unit || 'ft'} per round)</label>
                    <input type="number" id="force" value="${gridInfo?.scale?.multiplier || 10}" step="${gridInfo?.scale?.multiplier || 5}" />
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

export function collectTerrainData(terrainType: string): TerrainData {
    const nameInput = document.getElementById('terrainName') as HTMLInputElement;
    const terrainName = nameInput ? nameInput.value || `${terrainType} terrain` : `${terrainType} terrain`;

    const data: TerrainData = {
        type: terrainType,
        name: terrainName,
    };

    switch (terrainType) {
        case 'altitude':
            data.heightLevel = parseInt((document.getElementById('heightLevel') as HTMLInputElement)?.value || '20');
            break;
        case 'difficult':
        case 'speedy':
            data.movementMultiplier = parseFloat((document.getElementById('movementMultiplier') as HTMLInputElement)?.value || '1');
            break;
        case 'current':
            data.direction = parseInt((document.getElementById('direction') as HTMLInputElement)?.value || '0');
            data.force = parseInt((document.getElementById('force') as HTMLInputElement)?.value || '10');
            break;
        case 'hazard':
            data.effectType = (document.getElementById('effectType') as HTMLSelectElement)?.value || 'damage';
            data.effectDescription = (document.getElementById('effectDescription') as HTMLInputElement)?.value || '';
            break;
    }

    return data;
}
