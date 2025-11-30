import OBR, { buildShape, Item } from "@owlbear-rodeo/sdk";
import { grid, Point } from "@davidsev/owlbear-utils";
import { CellOutliner, Command } from "./utils/CellOutliner";

// Initialize the Owlbear Rodeo SDK
let selectedTerrainType: string | null = null;
let pendingTerrainData: any = null;
let gridInfo: any = null;
let selectedCells = new Set<string>(); // Store unique cell coordinates as "x,y" strings
let previewShape: any = null;
let isDrawingMode = false;


const TOOL_MODE_ID = "owlbear-terrain/draw-mode";

// Terrain type colors and styles
const TERRAIN_STYLES: Record<string, { fillColor: string, strokeColor: string, fillOpacity: number }> = {
    altitude: { fillColor: '#87CEEB', strokeColor: '#4682B4', fillOpacity: 0.3 },
    difficult: { fillColor: '#8B4513', strokeColor: '#654321', fillOpacity: 0.3 },
    speedy: { fillColor: '#32CD32', strokeColor: '#228B22', fillOpacity: 0.3 },
    current: { fillColor: '#00CED1', strokeColor: '#008B8B', fillOpacity: 0.3 },
    hazard: { fillColor: '#FF4500', strokeColor: '#8B0000', fillOpacity: 0.3 }
};

// Initialize when OBR is ready
OBR.onReady(async () => {
    console.log("Owlbear Terrain extension loaded");

    // Set up event listeners
    setupEventListeners();

    // Load grid information and initialize grid utility
    await loadGridInfo();

    // Create custom tool
    await setupCustomTool();

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

    // Apply terrain button
    const applyBtn = document.getElementById('applyTerrain');
    if (applyBtn) {
        applyBtn.addEventListener('click', startTerrainDrawing);
    }

    // Finish button (hidden by default)
    const finishBtn = document.getElementById('finishTerrain');
    if (finishBtn) {
        finishBtn.addEventListener('click', finishTerrainDrawing);
    }

    // Cancel button (hidden by default)
    const cancelBtn = document.getElementById('cancelTerrain');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelTerrainDrawing);
    }

    // Clear all terrain button
    const clearAllBtn = document.getElementById('clearAllTerrain');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllTerrain);
    }
}

async function setupCustomTool() {
    // Register a custom tool mode for drawing terrain
    await OBR.tool.createMode({
        id: TOOL_MODE_ID,
        icons: [],
        onToolDragStart: async (_context, event) => {
            if (!isDrawingMode) return;
            addCellsInDrag(event.pointerPosition, event.pointerPosition);
        },

        onToolDragMove: async (_context, event) => {
            if (!isDrawingMode) return;
            // Add cells as we drag
            addCellsInDrag(event.pointerPosition, event.pointerPosition);
        },

        onToolDragEnd: async (_context, _event) => {
            // Don't finish - just release the drag
            await updatePreviewShape();
        },

        onToolClick: async (_context, event) => {
            if (!isDrawingMode) return;
            console.log('Tool clicked at:', event.pointerPosition);
            // Single click adds/toggles a cell
            const point = new Point(event.pointerPosition.x, event.pointerPosition.y);
            const cell = grid.getCell(point);
            // Calculate grid indices
            const cellX = Math.floor(cell.center.x / grid.dpi);
            const cellY = Math.floor(cell.center.y / grid.dpi);
            const cellKey = `${cellX},${cellY}`;
            console.log('Toggling cell:', cellKey);

            if (selectedCells.has(cellKey)) {
                selectedCells.delete(cellKey);
            } else {
                selectedCells.add(cellKey);
            }

            await updatePreviewShape();
        }
    });
}

function addCellsInDrag(start: { x: number, y: number }, end: { x: number, y: number }) {
    const startPoint = new Point(start.x, start.y);
    const endPoint = new Point(end.x, end.y);

    const startCell = grid.getCell(startPoint);
    const endCell = grid.getCell(endPoint);

    // Calculate grid indices
    const startX = Math.floor(startCell.center.x / grid.dpi);
    const startY = Math.floor(startCell.center.y / grid.dpi);
    const endX = Math.floor(endCell.center.x / grid.dpi);
    const endY = Math.floor(endCell.center.y / grid.dpi);

    // Get all cells in the rectangle
    const minCellX = Math.min(startX, endX);
    const maxCellX = Math.max(startX, endX);
    const minCellY = Math.min(startY, endY);
    const maxCellY = Math.max(startY, endY);

    for (let x = minCellX; x <= maxCellX; x++) {
        for (let y = minCellY; y <= maxCellY; y++) {
            selectedCells.add(`${x},${y}`);
        }
    }
}

async function updatePreviewShape() {
    console.log('Updating preview shape. Selected cells:', selectedCells.size);
    if (selectedCells.size === 0) {
        if (previewShape) {
            await OBR.scene.items.deleteItems([previewShape.id]);
            previewShape = null;
        }
        return;
    }

    const style = TERRAIN_STYLES[pendingTerrainData.type];

    // Convert selected cells to Cell objects
    const cells = [];
    for (const cellKey of selectedCells) {
        const [x, y] = cellKey.split(',').map(Number);
        // We use the center of the cell to ensure we get the correct cell from grid.getCell
        // grid.dpi is the size of a cell in world units.
        // We need to convert grid index back to world coordinate (roughly center)
        // Note: grid indices might be 0.5 offset depending on how grid works, but usually 
        // if we rounded center/dpi, then index*dpi is close to center.
        const cellPoint = new Point(x * grid.dpi, y * grid.dpi);
        cells.push(grid.getCell(cellPoint));
    }
    console.log('Converted to cells:', cells.length);

    const outliner = new CellOutliner(cells);
    const commands = outliner.getOutlinePath();
    console.log('Generated commands:', commands);

    if (commands.length === 0) {
        console.warn('No commands generated from cells');
        return;
    }

    // Calculate bounding box from the outline points
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Iterate over outline loops to find bounds
    for (const loop of outliner.outline) {
        for (const point of loop) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
    }

    const width = maxX - minX;
    const height = maxY - minY;

    // Normalize commands to be relative to the top-left (minX, minY)
    const normalizedCommands = commands.map(cmd => {
        const newCmd = [...cmd];
        if (newCmd[0] === Command.MOVE || newCmd[0] === Command.LINE) {
            newCmd[1] -= minX;
            newCmd[2] -= minY;
        }
        // Handle other commands if implemented (QUAD, CUBIC etc have more points)
        // CellOutliner only produces MOVE, LINE, CLOSE
        return newCmd;
    });

    if (previewShape) {
        // Update existing preview
        await OBR.scene.items.updateItems([previewShape.id], (items) => {
            for (let item of items) {
                item.width = width;
                item.height = height;
                item.position = { x: minX, y: minY };
                // @ts-ignore - commands is valid for PATH type
                item.commands = normalizedCommands;
                item.metadata['owlbear-terrain/cellCount'] = selectedCells.size;
            }
        });
    } else {
        // Create new preview
        const shape = buildShape()
            .position({ x: minX, y: minY })
            .width(width)
            .height(height)
            .shapeType("PATH" as any)
            .fillColor(style.fillColor)
            .fillOpacity(style.fillOpacity)
            .strokeColor(style.strokeColor)
            .strokeWidth(3)
            .strokeDash([10, 5]) // Dashed to show it's a preview
            .layer("DRAWING")
            .name(`${pendingTerrainData.name} (preview)`)
            .metadata({
                'owlbear-terrain/type': pendingTerrainData.type,
                'owlbear-terrain/data': pendingTerrainData,
                'owlbear-terrain/temp': true,
                'owlbear-terrain/cellCount': selectedCells.size
            })
            .build();

        // @ts-ignore - commands is valid for PATH type
        shape.commands = normalizedCommands;

        await OBR.scene.items.addItems([shape]);
        previewShape = shape;
    }
}

async function finishTerrainDrawing() {
    if (selectedCells.size === 0) {
        OBR.notification.show('No cells selected', 'WARNING');
        return;
    }

    if (previewShape) {
        // Convert preview to final terrain
        await OBR.scene.items.updateItems([previewShape.id], (items) => {
            for (let item of items) {
                delete item.metadata['owlbear-terrain/temp'];
                item.strokeDash = []; // Remove dashed border
                item.name = pendingTerrainData.name;

                // Calculate grid size
                const gridWidth = Math.round(item.width / grid.dpi);
                const gridHeight = Math.round(item.height / grid.dpi);
                item.metadata['owlbear-terrain/gridSize'] = { width: gridWidth, height: gridHeight };
            }
        });

        OBR.notification.show(`Terrain "${pendingTerrainData.name}" created with ${selectedCells.size} cells!`, 'SUCCESS');
    }

    // Clean up
    await resetDrawingMode();

    // Refresh list
    await loadTerrainAreas();

    // Switch back to select tool
    await OBR.tool.activateTool("rodeo.owlbear.tool/select");
}

async function cancelTerrainDrawing() {
    if (previewShape) {
        await OBR.scene.items.deleteItems([previewShape.id]);
    }

    await resetDrawingMode();

    // Switch back to select tool
    await OBR.tool.activateTool("rodeo.owlbear.tool/select");

    OBR.notification.show('Terrain drawing cancelled', 'INFO');
}

async function resetDrawingMode() {
    selectedCells.clear();
    previewShape = null;
    isDrawingMode = false;
    pendingTerrainData = null;

    // Hide action buttons, show apply button
    document.getElementById('finishTerrain')?.classList.add('hidden');
    document.getElementById('cancelTerrain')?.classList.add('hidden');
    document.getElementById('applyTerrain')?.classList.remove('hidden');
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
                    <input type="number" id="heightLevel" value="0" step="${gridInfo?.scale?.multiplier || 5}" />
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
            pendingTerrainData.heightLevel = parseInt((document.getElementById('heightLevel') as HTMLInputElement)?.value || '0');
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

    // Enter drawing mode
    isDrawingMode = true;
    selectedCells.clear();

    // Show Finish/Cancel buttons, hide Apply button
    document.getElementById('applyTerrain')?.classList.add('hidden');
    document.getElementById('finishTerrain')?.classList.remove('hidden');
    document.getElementById('cancelTerrain')?.classList.remove('hidden');

    // Show instructions
    OBR.notification.show(
        'Click and drag to paint terrain cells. Click Finish when done.',
        'INFO'
    );

    // Activate our custom tool
    await OBR.tool.activateTool("rodeo.owlbear.tool/select");
    await OBR.tool.activateMode("rodeo.owlbear.tool/select", TOOL_MODE_ID);
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
