import OBR, { buildPath, buildShape, Item, Vector2 } from "@owlbear-rodeo/sdk";
import { grid, Point, Cell } from "@davidsev/owlbear-utils";
import { MOVEMENT_TOOL_ID, MOVEMENT_MODE_ID } from "../config/constants";
import { getAdjacentCells, isPlayerOwnedToken, moveTokenToCell } from "./movementService";
import { Command } from "../utils/CellOutliner";

interface MovementState {
    selectedToken: Item | null;
    highlightedCells: Cell[];
}

// Default token size for bounding box checks (in pixels)
const DEFAULT_TOKEN_SIZE = 50;

export async function registerMovementTool() {
    console.log("Registering Movement Constraint tool");

    const state: MovementState = {
        selectedToken: null,
        highlightedCells: []
    };

    await OBR.tool.create({
        id: MOVEMENT_TOOL_ID,
        shortcut: "M",
        icons: [{
            icon: "/movement_icon.svg",
            label: "Movement",
        }],
        defaultMode: MOVEMENT_MODE_ID,
    });

    await OBR.tool.createMode({
        id: MOVEMENT_MODE_ID,
        icons: [],
        async onToolClick(_context, event) {
            console.log('Movement tool click at:', event.pointerPosition);

            // Check if we clicked on a token
            const point = new Point(event.pointerPosition.x, event.pointerPosition.y);
            const clickedItems = await OBR.scene.items.getItems((item) => {
                if (item.layer !== 'CHARACTER') return false;
                
                // Simple bounding box check
                const pos = item.position;
                const bounds = (item as any).bounds || { width: DEFAULT_TOKEN_SIZE, height: DEFAULT_TOKEN_SIZE };
                
                return event.pointerPosition.x >= pos.x - bounds.width / 2 &&
                       event.pointerPosition.x <= pos.x + bounds.width / 2 &&
                       event.pointerPosition.y >= pos.y - bounds.height / 2 &&
                       event.pointerPosition.y <= pos.y + bounds.height / 2;
            });

            // Filter to player-owned tokens
            const ownedTokens: Item[] = [];
            for (const item of clickedItems) {
                if (await isPlayerOwnedToken(item)) {
                    ownedTokens.push(item);
                }
            }

            if (ownedTokens.length > 0) {
                // Selected a token - highlight adjacent cells
                const token = ownedTokens[0];
                state.selectedToken = token;
                state.highlightedCells = getAdjacentCells(token.position);
                
                console.log(`Selected token ${token.name}, showing ${state.highlightedCells.length} adjacent cells`);
                
                // Show highlights
                await showAdjacentCellHighlights(state.highlightedCells);
                
                OBR.notification.show(
                    `Selected ${token.name}. Click an adjacent cell to move.`,
                    'INFO'
                );
            } else if (state.selectedToken && state.highlightedCells.length > 0) {
                // Check if we clicked on a highlighted cell
                const clickedCell = grid.getCell(point);
                
                const isAdjacentCell = state.highlightedCells.some(cell => 
                    Math.abs(cell.center.x - clickedCell.center.x) < grid.dpi / 2 &&
                    Math.abs(cell.center.y - clickedCell.center.y) < grid.dpi / 2
                );
                
                if (isAdjacentCell) {
                    console.log('Moving token to adjacent cell');
                    
                    // Move the token
                    await moveTokenToCell(state.selectedToken.id, clickedCell);
                    
                    // Clear highlights
                    await clearHighlights();
                    
                    // Update state - get the updated token position
                    const updatedToken = await OBR.scene.items.getItems([state.selectedToken.id]);
                    if (updatedToken.length > 0) {
                        state.selectedToken = updatedToken[0];
                        state.highlightedCells = getAdjacentCells(state.selectedToken.position);
                        
                        // Show new highlights
                        await showAdjacentCellHighlights(state.highlightedCells);
                        
                        OBR.notification.show(
                            'Token moved. Click another adjacent cell or select a different token.',
                            'SUCCESS'
                        );
                    }
                } else {
                    // Clicked outside highlighted cells - deselect
                    state.selectedToken = null;
                    state.highlightedCells = [];
                    await clearHighlights();
                    
                    OBR.notification.show(
                        'Movement cancelled. Select a token to start moving.',
                        'INFO'
                    );
                }
            }
        },
        async onToolDragStart(_context, _event) {
            // Prevent dragging in movement mode
            return;
        },
        async onToolDragMove(_context, _event) {
            return;
        },
        async onToolDragEnd(_context, _event) {
            return;
        },
        async onToolDragCancel() {
            return;
        }
    });

    console.log("Movement tool registered");
}

/**
 * Show highlights for adjacent cells
 */
async function showAdjacentCellHighlights(cells: Cell[]): Promise<void> {
    // First, clear any existing highlights
    await clearHighlights();
    
    // Create highlight shapes for each adjacent cell
    const highlights: any[] = [];
    
    for (const cell of cells) {
        const highlight = buildPath()
            .position({ x: cell.center.x, y: cell.center.y })
            .commands([
                [Command.MOVE, -grid.dpi/2, -grid.dpi/2],
                [Command.LINE, grid.dpi/2, -grid.dpi/2],
                [Command.LINE, grid.dpi/2, grid.dpi/2],
                [Command.LINE, -grid.dpi/2, grid.dpi/2],
                [Command.CLOSE]
            ])
            .fillColor('#00FF00')
            .fillOpacity(0.3)
            .strokeColor('#00AA00')
            .strokeWidth(3)
            .layer("DRAWING")
            .name('Movement Highlight')
            .locked(true)
            .metadata({
                'owlbear-terrain/movement-highlight': true
            })
            .build();
        
        highlights.push(highlight);
    }
    
    await OBR.scene.items.addItems(highlights);
}

/**
 * Clear all movement highlights
 */
async function clearHighlights(): Promise<void> {
    try {
        const highlights = await OBR.scene.items.getItems((item) =>
            item.metadata['owlbear-terrain/movement-highlight'] === true
        );
        
        if (highlights.length > 0) {
            const ids = highlights.map(h => h.id);
            await OBR.scene.items.deleteItems(ids);
        }
    } catch (error) {
        console.error('Error clearing highlights:', error);
    }
}
