import OBR, { buildPath, buildText, Item } from "@owlbear-rodeo/sdk";
import { grid, Point } from "@davidsev/owlbear-utils";
import { CellOutliner, Command } from "./utils/CellOutliner";

const TOOL_ID = "owlbear-terrain/tool";
const TOOL_MODE_ID = "owlbear-terrain/draw-mode";

// Terrain type colors and styles
const TERRAIN_STYLES: Record<string, { fillColor: string, strokeColor: string, fillOpacity: number }> = {
    altitude: { fillColor: '#87CEEB', strokeColor: '#4682B4', fillOpacity: 0.3 },
    difficult: { fillColor: '#8B4513', strokeColor: '#654321', fillOpacity: 0.3 },
    speedy: { fillColor: '#32CD32', strokeColor: '#228B22', fillOpacity: 0.3 },
    current: { fillColor: '#00CED1', strokeColor: '#008B8B', fillOpacity: 0.3 },
    hazard: { fillColor: '#FF4500', strokeColor: '#8B0000', fillOpacity: 0.3 }
};

// UI state (popover context only)
let selectedTerrainType: string | null = null;
let pendingTerrainData: any = null;
let gridInfo: any = null;

// Initialize when OBR is ready
OBR.onReady(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const isPopover = searchParams.get('popover') === 'true';

    if (!isPopover) {
        // Background mode - register the tool
        console.log("Owlbear Terrain background loaded");

        // State for the tool mode (in background context)
        let currentInteraction: any = null;
        const selectedCells = new Set<string>();

        await OBR.tool.create({
            id: TOOL_ID,
            shortcut: "N",
            icons: [{
                icon: "/icon.svg",
                label: "Terrain",
            }],
            defaultMode: TOOL_MODE_ID,
        });

        await OBR.tool.createMode({
            id: TOOL_MODE_ID,
            icons: [],
            async onToolDragStart(_context, event) {
                console.log('Drag start at:', event.pointerPosition);

                // Get terrain data from scene metadata
                const metadata = await OBR.scene.getMetadata();
                console.log('Scene metadata:', metadata);

                const terrainData = metadata['owlbear-terrain/pendingData'] as any;
                console.log('Terrain data:', terrainData);

                if (!terrainData) {
                    console.error('No terrain data in scene metadata. Please click "Apply Terrain" first.');
                    return;
                }

                const style = TERRAIN_STYLES[terrainData.type];

                // Clear previous selection
                selectedCells.clear();

                // Add starting cell
                const point = new Point(event.pointerPosition.x, event.pointerPosition.y);
                const cell = grid.getCell(point);
                const cellX = Math.floor(cell.center.x / grid.dpi);
                const cellY = Math.floor(cell.center.y / grid.dpi);
                selectedCells.add(`${cellX},${cellY}`);

                // Create initial path shape
                const shape = buildPath()
                    .position({ x: cell.center.x, y: cell.center.y })
                    .commands([[Command.MOVE, 0, 0], [Command.LINE, grid.dpi, 0], [Command.LINE, grid.dpi, grid.dpi], [Command.LINE, 0, grid.dpi], [Command.CLOSE]])
                    .fillColor(style.fillColor)
                    .fillOpacity(style.fillOpacity)
                    .strokeColor(style.strokeColor)
                    .strokeWidth(3)
                    .strokeDash([10, 5])
                    .layer("DRAWING")
                    .name(`${terrainData.name} (drawing)`)
                    .metadata({
                        'owlbear-terrain/type': terrainData.type,
                        'owlbear-terrain/data': terrainData,
                        'owlbear-terrain/temp': true
                    })
                    .build();

                console.log('Starting interaction with shape:', shape);
                try {
                    currentInteraction = await OBR.interaction.startItemInteraction([shape]);
                    console.log('Interaction started successfully');
                } catch (error) {
                    console.error('Failed to start interaction:', error);
                    throw error;
                }
            },
            async onToolDragMove(_context, event) {
                if (!currentInteraction) return;

                const point = new Point(event.pointerPosition.x, event.pointerPosition.y);
                const cell = grid.getCell(point);
                const cellX = Math.floor(cell.center.x / grid.dpi);
                const cellY = Math.floor(cell.center.y / grid.dpi);
                const cellKey = `${cellX},${cellY}`;
                selectedCells.add(cellKey);

                const [update] = currentInteraction;
                update((items: any[]) => {
                    if (items.length > 0 && selectedCells.size > 0) {
                        // Convert cells to path
                        const cells = Array.from(selectedCells).map(key => {
                            const [x, y] = key.split(',').map(Number);
                            const cellPoint = new Point(x * grid.dpi, y * grid.dpi);
                            return grid.getCell(cellPoint);
                        });

                        const outliner = new CellOutliner(cells);
                        const commands = outliner.getOutlinePath();

                        if (commands.length > 0) {
                            // Calculate bounds
                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                            for (const loop of outliner.outline) {
                                for (const point of loop) {
                                    minX = Math.min(minX, point.x);
                                    minY = Math.min(minY, point.y);
                                    maxX = Math.max(maxX, point.x);
                                    maxY = Math.max(maxY, point.y);
                                }
                            }

                            // Normalize commands to be relative to position
                            const normalizedCommands = commands.map(cmd => {
                                const newCmd = [...cmd];
                                if (newCmd[0] === Command.MOVE || newCmd[0] === Command.LINE) {
                                    newCmd[1] -= minX;
                                    newCmd[2] -= minY;
                                }
                                return newCmd;
                            });

                            // Update path - PATH items don't have width/height, bounds are calculated from commands
                            items[0].position = { x: minX, y: minY };
                            items[0].commands = normalizedCommands;
                        }
                    }
                });
            },
            async onToolDragEnd(_context, _event) {
                console.log('Drag end, cells:', selectedCells.size);

                if (!currentInteraction) return;

                const [update, stop] = currentInteraction;

                // Only add items if we have enough cells
                if (selectedCells.size > 0) {
                    // Do a final update to finalize the items
                    const items = update((items: any[]) => {
                        if (items.length > 0) {
                            delete items[0].metadata['owlbear-terrain/temp'];
                            // Update style: transparent fill with thick dark grey stroke
                            items[0].style.strokeDash = [];
                            items[0].style.fillOpacity = 0; // Make fill transparent
                            items[0].style.strokeColor = '#404040'; // Dark grey
                            items[0].style.strokeWidth = 16; // Thick stroke
                            items[0].metadata['owlbear-terrain/cellCount'] = selectedCells.size;
                        }
                    });

                    console.log('Adding terrain items to scene, count:', items.length);
                    console.log('Item details:', JSON.stringify(items[0], null, 2));

                    // Add items to scene before stopping interaction
                    if (items.length > 0) {
                        try {
                            const terrainData = items[0].metadata['owlbear-terrain/data'] as any;
                            const itemsToAdd: Item[] = [items[0]];

                            // If it's altitude terrain, add a text label showing the height
                            if (terrainData && terrainData.type === 'altitude' && terrainData.heightLevel !== undefined) {
                                const heightValue = terrainData.heightLevel;
                                const heightText = heightValue >= 0 ? `+${heightValue}` : `${heightValue}`;

                                const label = buildText()
                                    .position({ x: items[0].position.x + 5, y: items[0].position.y + 5 })
                                    .plainText(heightText)
                                    .textType('PLAIN')
                                    .fontWeight(700)
                                    .fontSize(32)
                                    .width(60)
                                    .height(40)
                                    .strokeColor('#000000')
                                    .strokeWidth(3)
                                    .textAlign('LEFT')
                                    .textAlignVertical('TOP')
                                    .fillColor('#FFFFFF')
                                    .metadata({
                                        'owlbear-terrain/type': 'altitude-label',
                                        'owlbear-terrain/parentId': items[0].id
                                    })
                                    .locked(true)
                                    .layer('TEXT')
                                    .name(`${terrainData.name} (label)`)
                                    .attachedTo(items[0].id)
                                    .build();

                                itemsToAdd.push(label);
                            }

                            await OBR.scene.items.addItems(itemsToAdd);
                            console.log('Items added successfully');
                        } catch (error) {
                            console.error('Failed to add items:', error);
                            console.error('Error details:', JSON.stringify(error, null, 2));
                        }
                    }
                }

                // Stop the interaction (this removes temporary items)
                stop();
                currentInteraction = null;
                selectedCells.clear();
            },
            async onToolDragCancel() {
                if (currentInteraction) {
                    const [, stop] = currentInteraction;
                    stop();
                    currentInteraction = null;
                }
                selectedCells.clear();
            }
        });

        console.log("Terrain tool registered");
        return;
    }

    // Popover mode - UI
    console.log("Owlbear Terrain extension loaded (UI)");

    // Set up event listeners
    setupEventListeners();

    // Load grid information and initialize grid utility
    await loadGridInfo();

    // Load and display existing terrain areas
    await loadTerrainAreas();
});

function setupEventListeners() {
    // Terrain type selection
    const terrainButtons = document.querySelectorAll<HTMLElement>('.terrain-btn');
    console.log(`Found ${terrainButtons.length} terrain buttons`);

    terrainButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Terrain button clicked:', btn.dataset.type);

            // Remove active class from all buttons
            terrainButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            selectedTerrainType = btn.dataset.type || null;
            if (selectedTerrainType) {
                showTerrainSettings(selectedTerrainType);
            }
        });
    });

    // Clear all terrain button
    const clearAllBtn = document.getElementById('clearAllTerrain');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllTerrain);
    }
}

async function loadGridInfo() {
    try {
        const isReady = await OBR.scene.isReady();
        if (!isReady) return;

        const dpi = await OBR.scene.grid.getDpi();
        const scale = await OBR.scene.grid.getScale();
        const type = await OBR.scene.grid.getType();
        const measurement = await OBR.scene.grid.getMeasurement();

        gridInfo = {
            dpi,
            scale: scale.parsed,
            type,
            measurement
        };

        console.log('Grid info loaded:', gridInfo);

        // Display grid info in UI
        updateGridDisplay();
    } catch (error) {
        console.log('Could not load grid info:', error);
    }
}

function updateGridDisplay() {
    const container = document.getElementById('gridInfo');
    if (!container || !gridInfo) return;

    const gridTypeDisplay = gridInfo.type.replace(/_/g, ' ').toLowerCase();
    const scaleDisplay = `${gridInfo.scale.multiplier}${gridInfo.scale.unit}`;

    container.innerHTML = `
        <div class="grid-info-item">
            <span class="grid-info-label">Grid:</span>
            <span class="grid-info-value">${gridTypeDisplay}, ${scaleDisplay} per cell</span>
        </div>
    `;
    container.style.display = 'block';
}

function showTerrainSettings(type: string) {
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

    // Automatically activate the tool whenever settings change
    const inputs = settingsContent.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            startTerrainDrawing();
        });
    });

    // Activate the tool immediately with current settings
    startTerrainDrawing();
}

async function startTerrainDrawing() {
    if (!selectedTerrainType) {
        OBR.notification.show('Please select a terrain type first', 'WARNING');
        return;
    }

    // Get terrain name
    const nameInput = document.getElementById('terrainName') as HTMLInputElement;
    const terrainName = nameInput ? nameInput.value || `${selectedTerrainType} terrain` : `${selectedTerrainType} terrain`;

    // Collect settings based on terrain type
    pendingTerrainData = {
        type: selectedTerrainType,
        name: terrainName,
    };

    switch (selectedTerrainType) {
        case 'altitude':
            pendingTerrainData.heightLevel = parseInt((document.getElementById('heightLevel') as HTMLInputElement)?.value || '20');
            break;
        case 'difficult':
        case 'speedy':
            pendingTerrainData.movementMultiplier = parseFloat((document.getElementById('movementMultiplier') as HTMLInputElement)?.value || '1');
            break;
        case 'current':
            pendingTerrainData.direction = parseInt((document.getElementById('direction') as HTMLInputElement)?.value || '0');
            pendingTerrainData.force = parseInt((document.getElementById('force') as HTMLInputElement)?.value || '10');
            break;
        case 'hazard':
            pendingTerrainData.effectType = (document.getElementById('effectType') as HTMLSelectElement)?.value || 'damage';
            pendingTerrainData.effectDescription = (document.getElementById('effectDescription') as HTMLInputElement)?.value || '';
            break;
    }

    console.log('Starting terrain drawing mode with data:', pendingTerrainData);

    try {
        // Store terrain data in scene-level metadata so it can be accessed by background context
        await OBR.scene.setMetadata({
            'owlbear-terrain/pendingData': pendingTerrainData
        });
        console.log('Scene metadata set with terrain data');

        // Activate the terrain tool
        await OBR.tool.activateTool(TOOL_ID);
        console.log('Tool activation called');

        // Verify tool is active
        const activeTool = await OBR.tool.getActiveTool();
        console.log('Active tool after activation:', activeTool);

        if (activeTool === TOOL_ID) {
            // Show instructions
            OBR.notification.show(
                'Terrain tool active! Click and drag on the map to paint terrain cells.',
                'INFO'
            );
        } else {
            console.error('Tool activation failed. Active tool is:', activeTool);
            OBR.notification.show(
                'Failed to activate terrain tool. Please try pressing N or clicking the Terrain icon in the toolbar.',
                'ERROR'
            );
        }
    } catch (error) {
        console.error('Error activating tool:', error);
        OBR.notification.show(
            'Error: ' + (error as Error).message,
            'ERROR'
        );
    }
}

async function loadTerrainAreas() {
    try {
        // Check if we're in a scene context
        const isReady = await OBR.scene.isReady();
        if (!isReady) {
            console.log('Not in a scene yet, skipping terrain load');
            return;
        }

        // Load all items with terrain metadata (excluding temp items)
        const terrainItems = await OBR.scene.items.getItems((item) =>
            item.metadata['owlbear-terrain/type'] !== undefined &&
            !item.metadata['owlbear-terrain/temp']
        );

        console.log('Found terrain items:', terrainItems.length);
        updateTerrainList(terrainItems);

    } catch (error: any) {
        // It's normal to not have a scene when first opening the extension
        if (error.name === 'MissingDataError') {
            console.log('No scene loaded yet');
        } else {
            console.error('Error loading terrain areas:', error);
        }
    }
}

function updateTerrainList(terrainItems: Item[]) {
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
        const details = getTerrainDetails(terrainData, gridSize, cellCount);
        html += `
            <div class="terrain-item">
                <div class="terrain-item-info">
                    <div class="terrain-item-name">${item.name}</div>
                    <div class="terrain-item-details">${details}</div>
                </div>
                <button class="terrain-item-remove" onclick="window.removeTerrain('${item.id}')">Remove</button>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

function getTerrainDetails(terrain: any, gridSize: any, cellCount: any) {
    if (!terrain) return '';

    let details = '';

    // Add cell count or grid size
    if (cellCount) {
        details = `${cellCount} cells • `;
    } else if (gridSize) {
        const sizeStr = gridSize.width === gridSize.height
            ? `${gridSize.width}×${gridSize.width}`
            : `${gridSize.width}×${gridSize.height}`;
        details = `${sizeStr} cells • `;
    }

    // Add terrain-specific details
    switch (terrain.type) {
        case 'altitude':
            details += `Height: ${terrain.heightLevel}${gridInfo?.scale?.unit || 'ft'}`;
            break;
        case 'difficult':
            details += `Movement: ${terrain.movementMultiplier}x (${Math.round((1 - terrain.movementMultiplier) * 100)}% slower)`;
            break;
        case 'speedy':
            details += `Movement: ${terrain.movementMultiplier}x (${Math.round((terrain.movementMultiplier - 1) * 100)}% faster)`;
            break;
        case 'current':
            details += `${terrain.direction}°, ${terrain.force}${gridInfo?.scale?.unit || 'ft'}/round`;
            break;
        case 'hazard':
            details += `${terrain.effectType}: ${terrain.effectDescription}`;
            break;
        default:
            details += '';
    }

    return details;
}

// Make removeTerrain available globally for onclick handlers
(window as any).removeTerrain = async function (itemId: string) {
    try {
        await OBR.scene.items.deleteItems([itemId]);
        await loadTerrainAreas();
        OBR.notification.show('Terrain removed', 'INFO');
    } catch (error) {
        console.error('Error removing terrain:', error);
        OBR.notification.show('Error removing terrain', 'ERROR');
    }
};

async function clearAllTerrain() {
    try {
        // Check if we're in a scene context
        const isReady = await OBR.scene.isReady();
        if (!isReady) {
            OBR.notification.show('No scene loaded', 'WARNING');
            return;
        }

        // Get all terrain items (excluding temp preview items)
        const terrainItems = await OBR.scene.items.getItems((item) =>
            item.metadata['owlbear-terrain/type'] !== undefined &&
            !item.metadata['owlbear-terrain/temp']
        );

        if (terrainItems.length === 0) {
            OBR.notification.show('No terrain to clear', 'INFO');
            return;
        }

        // Confirm with user
        const confirmed = confirm(`Are you sure you want to remove all ${terrainItems.length} terrain area(s)?`);
        if (!confirmed) {
            return;
        }

        // Delete all terrain items
        const itemIds = terrainItems.map(item => item.id);
        await OBR.scene.items.deleteItems(itemIds);

        // Refresh the list
        await loadTerrainAreas();

        OBR.notification.show(`Cleared ${terrainItems.length} terrain area(s)`, 'SUCCESS');
    } catch (error) {
        console.error('Error clearing all terrain:', error);
        OBR.notification.show('Error clearing terrain', 'ERROR');
    }
}
