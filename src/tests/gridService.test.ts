import { describe, it, expect, vi } from 'vitest';
import { loadGridInfo, updateGridDisplay } from '../services/gridService';
import OBR from '@owlbear-rodeo/sdk';

describe('gridService', () => {
  describe('loadGridInfo', () => {
    it('should return null when scene is not ready', async () => {
      vi.mocked(OBR.scene.isReady).mockResolvedValue(false);
      
      const result = await loadGridInfo();
      
      expect(result).toBeNull();
    });

    it('should load grid information when scene is ready', async () => {
      vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
      vi.mocked(OBR.scene.grid.getDpi).mockResolvedValue(150);
      vi.mocked(OBR.scene.grid.getScale).mockResolvedValue({ 
        parsed: { multiplier: 5, unit: 'ft' } 
      } as any);
      vi.mocked(OBR.scene.grid.getType).mockResolvedValue('SQUARE' as any);
      vi.mocked(OBR.scene.grid.getMeasurement).mockResolvedValue('5ft' as any);
      
      const result = await loadGridInfo();
      
      expect(result).toEqual({
        dpi: 150,
        scale: { multiplier: 5, unit: 'ft' },
        type: 'SQUARE',
        measurement: '5ft',
      });
    });

    it('should return null when there is an error', async () => {
      vi.mocked(OBR.scene.isReady).mockRejectedValue(new Error('Test error'));
      
      const result = await loadGridInfo();
      
      expect(result).toBeNull();
    });
  });

  describe('updateGridDisplay', () => {
    it('should not update when container is missing', () => {
      document.body.innerHTML = '';
      
      const gridInfo = {
        dpi: 150,
        scale: { multiplier: 5, unit: 'ft' },
        type: 'SQUARE',
        measurement: '5ft',
      };
      
      // Should not throw
      updateGridDisplay(gridInfo);
    });

    it('should update grid display with formatted info', () => {
      document.body.innerHTML = '<div id="gridInfo"></div>';
      
      const gridInfo = {
        dpi: 150,
        scale: { multiplier: 5, unit: 'ft' },
        type: 'SQUARE',
        measurement: '5ft',
      };
      
      updateGridDisplay(gridInfo);
      
      const container = document.getElementById('gridInfo');
      expect(container?.style.display).toBe('block');
      expect(container?.innerHTML).toContain('square');
      expect(container?.innerHTML).toContain('5ft per cell');
    });

    it('should handle underscore in grid type', () => {
      document.body.innerHTML = '<div id="gridInfo"></div>';
      
      const gridInfo = {
        dpi: 150,
        scale: { multiplier: 5, unit: 'ft' },
        type: 'HEX_VERTICAL',
        measurement: '5ft',
      };
      
      updateGridDisplay(gridInfo);
      
      const container = document.getElementById('gridInfo');
      expect(container?.innerHTML).toContain('hex vertical');
    });
  });
});
