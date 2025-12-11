import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdjacentCells, isPlayerOwnedToken, getPlayerOwnedTokens, moveTokenToCell } from '../services/movementService';
import { grid } from '@davidsev/owlbear-utils';

// Mock the grid utilities
vi.mock('@davidsev/owlbear-utils', () => {
    return {
        grid: {
            getCell: vi.fn((point: any) => ({
                center: { x: Math.floor(point.x / 150) * 150 + 75, y: Math.floor(point.y / 150) * 150 + 75 },
                edges: []
            })),
            dpi: 150,
            gridType: 'SQUARE'
        },
        Point: class Point {
            x: number;
            y: number;
            constructor(x: number, y: number) {
                this.x = x;
                this.y = y;
            }
        },
        Cell: class Cell {},
        LineSegment: class LineSegment {}
    };
});

describe('movementService', () => {
    describe('getAdjacentCells', () => {
        it('should return 8 adjacent cells for a square grid', () => {
            const position = { x: 225, y: 225 }; // Center of a cell
            const adjacentCells = getAdjacentCells(position);
            
            expect(adjacentCells).toHaveLength(8);
        });

        it('should return 6 adjacent cells for a hex grid', () => {
            // Temporarily set grid type to hex
            (grid as any).gridType = 'HEX_HORIZONTAL';
            
            const position = { x: 225, y: 225 };
            const adjacentCells = getAdjacentCells(position);
            
            expect(adjacentCells).toHaveLength(6);
            
            // Reset to square
            (grid as any).gridType = 'SQUARE';
        });
    });

    describe('isPlayerOwnedToken', () => {
        beforeEach(() => {
            vi.resetModules();
        });

        it('should return false for non-character items', async () => {
            const item: any = {
                layer: 'DRAWING',
                metadata: {}
            };

            const result = await isPlayerOwnedToken(item);
            expect(result).toBe(false);
        });
    });

    describe('getPlayerOwnedTokens', () => {
        it('should return empty array when scene is not ready', async () => {
            const tokens = await getPlayerOwnedTokens();
            expect(tokens).toEqual([]);
        });
    });

    describe('moveTokenToCell', () => {
        it('should handle errors gracefully', async () => {
            const cell: any = {
                center: { x: 225, y: 225 }
            };

            await expect(moveTokenToCell('test-id', cell)).rejects.toThrow();
        });
    });
});
