import OBR, { Item } from "@owlbear-rodeo/sdk";
import { GridInfo } from "./gridService";

export interface TerrainData {
    type: string;
    name: string;
    heightLevel?: number;
    movementMultiplier?: number;
    direction?: number;
    force?: number;
    effectType?: string;
    effectDescription?: string;
}

export async function loadTerrainAreas(): Promise<Item[]> {
    try {
        const isReady = await OBR.scene.isReady();
        if (!isReady) {
            console.log('Not in a scene yet, skipping terrain load');
            return [];
        }

        const terrainItems = await OBR.scene.items.getItems((item) =>
            item.metadata['owlbear-terrain/type'] !== undefined &&
            !item.metadata['owlbear-terrain/temp']
        );

        console.log('Found terrain items:', terrainItems.length);
        return terrainItems;
    } catch (error: any) {
        if (error.name === 'MissingDataError') {
            console.log('No scene loaded yet');
        } else {
            console.error('Error loading terrain areas:', error);
        }
        return [];
    }
}

export async function removeTerrainItem(itemId: string): Promise<void> {
    try {
        await OBR.scene.items.deleteItems([itemId]);
        OBR.notification.show('Terrain removed', 'INFO');
    } catch (error) {
        console.error('Error removing terrain:', error);
        OBR.notification.show('Error removing terrain', 'ERROR');
    }
}

export async function clearAllTerrain(): Promise<number> {
    try {
        const isReady = await OBR.scene.isReady();
        if (!isReady) {
            OBR.notification.show('No scene loaded', 'WARNING');
            return 0;
        }

        const terrainItems = await OBR.scene.items.getItems((item) =>
            item.metadata['owlbear-terrain/type'] !== undefined &&
            !item.metadata['owlbear-terrain/temp']
        );

        if (terrainItems.length === 0) {
            OBR.notification.show('No terrain to clear', 'INFO');
            return 0;
        }

        const confirmed = confirm(`Are you sure you want to remove all ${terrainItems.length} terrain area(s)?`);
        if (!confirmed) {
            return 0;
        }

        const itemIds = terrainItems.map(item => item.id);
        await OBR.scene.items.deleteItems(itemIds);

        OBR.notification.show(`Cleared ${terrainItems.length} terrain area(s)`, 'SUCCESS');
        return terrainItems.length;
    } catch (error) {
        console.error('Error clearing all terrain:', error);
        OBR.notification.show('Error clearing terrain', 'ERROR');
        return 0;
    }
}

export function getTerrainDetails(terrain: any, gridSize: any, cellCount: any, gridInfo: GridInfo | null): string {
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
