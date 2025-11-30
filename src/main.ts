import OBR from "@owlbear-rodeo/sdk";
import { TOOL_ID } from "./config/constants";
import { GridInfo, loadGridInfo, updateGridDisplay } from "./services/gridService";
import { TerrainData, loadTerrainAreas, clearAllTerrain } from "./services/terrainService";
import { registerTerrainTool } from "./services/toolService";
import { updateTerrainList, setupTerrainRemovalHandler, showTerrainSettings, collectTerrainData } from "./ui/terrainUI";

// UI state (popover context only)
let selectedTerrainType: string | null = null;
let gridInfo: GridInfo | null = null;

// Initialize when OBR is ready
OBR.onReady(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const isPopover = searchParams.get('popover') === 'true';

    if (!isPopover) {
        // Background mode - register the tool
        console.log("Owlbear Terrain background loaded");
        await registerTerrainTool();
        return;
    }

    // Popover mode - UI
    console.log("Owlbear Terrain extension loaded (UI)");

    // Set up event listeners
    setupEventListeners();

    // Setup terrain removal handler (now empty but kept for API compatibility)
    setupTerrainRemovalHandler();

    // Load grid information and initialize grid utility
    gridInfo = await loadGridInfo();
    if (gridInfo) {
        updateGridDisplay(gridInfo);
    }

    // Load and display existing terrain areas
    const terrainItems = await loadTerrainAreas();
    updateTerrainList(terrainItems, gridInfo);
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
                showTerrainSettings(selectedTerrainType, gridInfo);
                
                // Automatically activate the tool whenever settings change
                const settingsContent = document.getElementById('settingsContent');
                if (settingsContent) {
                    const inputs = settingsContent.querySelectorAll('input, select');
                    inputs.forEach(input => {
                        input.addEventListener('change', () => {
                            startTerrainDrawing();
                        });
                    });
                }
                
                // Activate the tool immediately with current settings
                startTerrainDrawing();
            }
        });
    });

    // Clear all terrain button
    const clearAllBtn = document.getElementById('clearAllTerrain');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            const count = await clearAllTerrain();
            if (count > 0) {
                const terrainItems = await loadTerrainAreas();
                updateTerrainList(terrainItems, gridInfo);
            }
        });
    }
}

async function startTerrainDrawing() {
    if (!selectedTerrainType) {
        OBR.notification.show('Please select a terrain type first', 'WARNING');
        return;
    }

    const terrainData = collectTerrainData(selectedTerrainType);
    console.log('Starting terrain drawing mode with data:', terrainData);

    try {
        // Store terrain data in scene-level metadata so it can be accessed by background context
        await OBR.scene.setMetadata({
            'owlbear-terrain/pendingData': terrainData
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
