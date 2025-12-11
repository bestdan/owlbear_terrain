import OBR, { Item, Vector2 } from "@owlbear-rodeo/sdk";
import { grid, Point, Cell } from "@davidsev/owlbear-utils";

/**
 * Get all adjacent grid cells to a given position, including diagonals
 */
export function getAdjacentCells(position: Vector2): Cell[] {
    const point = new Point(position.x, position.y);
    const currentCell = grid.getCell(point);
    
    const adjacentCells: Cell[] = [];
    const gridType = grid.gridType;
    
    if (gridType === 'SQUARE' || gridType === 'DIMETRIC') {
        // For square grids, get 8 adjacent cells (including diagonals)
        const offsets = [
            [-1, -1], [0, -1], [1, -1],  // Top row
            [-1,  0],          [1,  0],  // Middle row (left and right)
            [-1,  1], [0,  1], [1,  1]   // Bottom row
        ];
        
        for (const [dx, dy] of offsets) {
            const adjacentPoint = new Point(
                currentCell.center.x + dx * grid.dpi,
                currentCell.center.y + dy * grid.dpi
            );
            adjacentCells.push(grid.getCell(adjacentPoint));
        }
    } else if (gridType === 'HEX_HORIZONTAL' || gridType === 'HEX_VERTICAL') {
        // For hex grids, get 6 adjacent cells
        // The hex grid library should handle this automatically
        // We'll approximate by checking in a circular pattern
        const hexAngles = [0, 60, 120, 180, 240, 300];
        
        for (const angle of hexAngles) {
            const rad = (angle * Math.PI) / 180;
            const adjacentPoint = new Point(
                currentCell.center.x + Math.cos(rad) * grid.dpi,
                currentCell.center.y + Math.sin(rad) * grid.dpi
            );
            adjacentCells.push(grid.getCell(adjacentPoint));
        }
    }
    
    return adjacentCells;
}

/**
 * Check if a token is owned by the current player
 */
export async function isPlayerOwnedToken(item: Item): Promise<boolean> {
    try {
        // Check if item is a token/character
        if (item.layer !== 'CHARACTER') {
            return false;
        }
        
        // Get current player
        const player = await OBR.player.getRole();
        
        // If player is GM, they can control everything
        if (player === 'GM') {
            return true;
        }
        
        // Check if this is the player's character
        const playerId = await OBR.player.getId();
        
        // OBR uses createdUserId to track ownership
        return (item as any).createdUserId === playerId;
    } catch (error) {
        console.error('Error checking token ownership:', error);
        return false;
    }
}

/**
 * Get all player-owned tokens in the scene
 */
export async function getPlayerOwnedTokens(): Promise<Item[]> {
    try {
        const isReady = await OBR.scene.isReady();
        if (!isReady) {
            return [];
        }
        
        const items = await OBR.scene.items.getItems((item) => 
            item.layer === 'CHARACTER'
        );
        
        const ownedTokens: Item[] = [];
        for (const item of items) {
            if (await isPlayerOwnedToken(item)) {
                ownedTokens.push(item);
            }
        }
        
        return ownedTokens;
    } catch (error) {
        console.error('Error getting player-owned tokens:', error);
        return [];
    }
}

/**
 * Move a token to a specific position
 */
export async function moveTokenToCell(tokenId: string, targetCell: Cell): Promise<void> {
    try {
        await OBR.scene.items.updateItems([tokenId], (items) => {
            for (const item of items) {
                // Center the token on the cell
                item.position = {
                    x: targetCell.center.x,
                    y: targetCell.center.y
                };
            }
        });
    } catch (error) {
        console.error('Error moving token:', error);
        throw error;
    }
}
