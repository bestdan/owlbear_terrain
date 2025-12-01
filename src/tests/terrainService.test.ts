import { describe, it, expect, vi } from 'vitest';
import { loadTerrainAreas, removeTerrainItem, clearAllTerrain, getTerrainDetails } from '../services/terrainService';
import OBR from '@owlbear-rodeo/sdk';

describe('terrainService', () => {
  describe('loadTerrainAreas', () => {
    it('should return empty array when scene is not ready', async () => {
      vi.mocked(OBR.scene.isReady).mockResolvedValue(false);
      
      const result = await loadTerrainAreas();
      
      expect(result).toEqual([]);
    });

    it('should load terrain items when scene is ready', async () => {
      const mockItems = [
        { id: '1', metadata: { 'owlbear-terrain/type': 'altitude' } },
        { id: '2', metadata: { 'owlbear-terrain/type': 'difficult' } },
      ];
      
      vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue(mockItems as any);
      
      const result = await loadTerrainAreas();
      
      expect(result).toEqual(mockItems);
      expect(OBR.scene.items.getItems).toHaveBeenCalled();
    });

    it('should return empty array on MissingDataError', async () => {
      const error = new Error('Missing data');
      error.name = 'MissingDataError';
      vi.mocked(OBR.scene.isReady).mockRejectedValue(error);
      
      const result = await loadTerrainAreas();
      
      expect(result).toEqual([]);
    });
  });

  describe('removeTerrainItem', () => {
    it('should delete item and show notification', async () => {
      await removeTerrainItem('test-id');
      
      expect(OBR.scene.items.deleteItems).toHaveBeenCalledWith(['test-id']);
      expect(OBR.notification.show).toHaveBeenCalledWith('Terrain removed', 'INFO');
    });

    it('should show error notification on failure', async () => {
      vi.mocked(OBR.scene.items.deleteItems).mockRejectedValue(new Error('Delete failed'));
      
      await removeTerrainItem('test-id');
      
      expect(OBR.notification.show).toHaveBeenCalledWith('Error removing terrain', 'ERROR');
    });
  });

  describe('clearAllTerrain', () => {
    it('should return 0 when scene is not ready', async () => {
      vi.mocked(OBR.scene.isReady).mockResolvedValue(false);
      
      const result = await clearAllTerrain();
      
      expect(result).toBe(0);
      expect(OBR.notification.show).toHaveBeenCalledWith('No scene loaded', 'WARNING');
    });

    it('should return 0 when no terrain items exist', async () => {
      vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue([]);
      
      const result = await clearAllTerrain();
      
      expect(result).toBe(0);
      expect(OBR.notification.show).toHaveBeenCalledWith('No terrain to clear', 'INFO');
    });

    it('should return 0 when user cancels confirmation', async () => {
      const mockItems = [
        { id: '1', metadata: { 'owlbear-terrain/type': 'altitude' } },
      ];
      
      vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue(mockItems as any);
      global.confirm = vi.fn().mockReturnValue(false);
      
      const result = await clearAllTerrain();
      
      expect(result).toBe(0);
      expect(OBR.scene.items.deleteItems).not.toHaveBeenCalled();
    });

    it('should delete all terrain items when user confirms', async () => {
      const mockItems = [
        { id: '1', metadata: { 'owlbear-terrain/type': 'altitude' } },
        { id: '2', metadata: { 'owlbear-terrain/type': 'difficult' } },
      ];
      
      vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue(mockItems as any);
      vi.mocked(OBR.scene.items.deleteItems).mockResolvedValue(undefined);
      global.confirm = vi.fn().mockReturnValue(true);
      
      const result = await clearAllTerrain();
      
      expect(result).toBe(2);
      expect(OBR.scene.items.deleteItems).toHaveBeenCalledWith(['1', '2']);
      expect(OBR.notification.show).toHaveBeenCalledWith('Cleared 2 terrain area(s)', 'SUCCESS');
    });
  });

  describe('getTerrainDetails', () => {
    const gridInfo = {
      dpi: 150,
      scale: { multiplier: 5, unit: 'ft' },
      type: 'SQUARE',
      measurement: '5ft',
    };

    it('should return empty string for null terrain', () => {
      const result = getTerrainDetails(null, null, null, gridInfo);
      expect(result).toBe('');
    });

    it('should format altitude terrain details', () => {
      const terrain = { type: 'altitude', heightLevel: 20 };
      const result = getTerrainDetails(terrain, null, 5, gridInfo);
      
      expect(result).toContain('5 cells');
      expect(result).toContain('Height: 20ft');
    });

    it('should format difficult terrain details', () => {
      const terrain = { type: 'difficult', movementMultiplier: 0.5 };
      const result = getTerrainDetails(terrain, null, 3, gridInfo);
      
      expect(result).toContain('3 cells');
      expect(result).toContain('Movement: 0.5x');
      expect(result).toContain('50% slower');
    });

    it('should format speedy terrain details', () => {
      const terrain = { type: 'speedy', movementMultiplier: 2 };
      const result = getTerrainDetails(terrain, null, 4, gridInfo);
      
      expect(result).toContain('4 cells');
      expect(result).toContain('Movement: 2x');
      expect(result).toContain('100% faster');
    });

    it('should format current terrain details', () => {
      const terrain = { type: 'current', direction: 90, force: 10 };
      const result = getTerrainDetails(terrain, null, 2, gridInfo);
      
      expect(result).toContain('2 cells');
      expect(result).toContain('90°');
      expect(result).toContain('10ft/round');
    });

    it('should format hazard terrain details', () => {
      const terrain = { type: 'hazard', effectType: 'damage', effectDescription: '1d6 fire' };
      const result = getTerrainDetails(terrain, null, 1, gridInfo);
      
      expect(result).toContain('1 cells');
      expect(result).toContain('damage: 1d6 fire');
    });

    it('should use gridSize when cellCount is not available', () => {
      const terrain = { type: 'altitude', heightLevel: 15 };
      const gridSize = { width: 3, height: 3 };
      const result = getTerrainDetails(terrain, gridSize, null, gridInfo);
      
      expect(result).toContain('3×3 cells');
    });

    it('should handle rectangular gridSize', () => {
      const terrain = { type: 'altitude', heightLevel: 15 };
      const gridSize = { width: 3, height: 5 };
      const result = getTerrainDetails(terrain, gridSize, null, gridInfo);
      
      expect(result).toContain('3×5 cells');
    });
  });
});
