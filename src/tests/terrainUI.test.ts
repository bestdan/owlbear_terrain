import { describe, it, expect, beforeEach } from 'vitest';
import { collectTerrainData, showTerrainSettings } from '../ui/terrainUI';

describe('terrainUI', () => {
  describe('collectTerrainData', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should collect altitude terrain data', () => {
      document.body.innerHTML = `
        <input id="terrainName" value="Test Hill" />
        <input id="heightLevel" value="25" />
      `;

      const result = collectTerrainData('altitude');

      expect(result).toEqual({
        type: 'altitude',
        name: 'Test Hill',
        heightLevel: 25,
      });
    });

    it('should use default name for altitude when input is empty', () => {
      document.body.innerHTML = `
        <input id="terrainName" value="" />
        <input id="heightLevel" value="20" />
      `;

      const result = collectTerrainData('altitude');

      expect(result.name).toBe('altitude terrain');
    });

    it('should collect difficult terrain data', () => {
      document.body.innerHTML = `
        <input id="terrainName" value="Dense Forest" />
        <input id="movementMultiplier" value="0.5" />
      `;

      const result = collectTerrainData('difficult');

      expect(result).toEqual({
        type: 'difficult',
        name: 'Dense Forest',
        movementMultiplier: 0.5,
      });
    });

    it('should collect speedy terrain data', () => {
      document.body.innerHTML = `
        <input id="terrainName" value="Magic Road" />
        <input id="movementMultiplier" value="2" />
      `;

      const result = collectTerrainData('speedy');

      expect(result).toEqual({
        type: 'speedy',
        name: 'Magic Road',
        movementMultiplier: 2,
      });
    });

    it('should collect current terrain data', () => {
      document.body.innerHTML = `
        <input id="terrainName" value="River Current" />
        <input id="direction" value="90" />
        <input id="force" value="15" />
      `;

      const result = collectTerrainData('current');

      expect(result).toEqual({
        type: 'current',
        name: 'River Current',
        direction: 90,
        force: 15,
      });
    });

    it('should collect hazard terrain data', () => {
      document.body.innerHTML = `
        <input id="terrainName" value="Lava Pool" />
        <select id="effectType"><option value="damage" selected>Damage</option></select>
        <input id="effectDescription" value="2d6 fire damage" />
      `;

      const result = collectTerrainData('hazard');

      expect(result).toEqual({
        type: 'hazard',
        name: 'Lava Pool',
        effectType: 'damage',
        effectDescription: '2d6 fire damage',
      });
    });
  });

  describe('showTerrainSettings', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="terrainSettings" style="display: none;">
          <div id="settingsContent"></div>
        </div>
      `;
    });

    const gridInfo = {
      dpi: 150,
      scale: { multiplier: 5, unit: 'ft' },
      type: 'SQUARE',
      measurement: '5ft',
    };

    it('should show settings section', () => {
      showTerrainSettings('altitude', gridInfo);

      const settingsSection = document.getElementById('terrainSettings');
      expect(settingsSection?.style.display).toBe('block');
    });

    it('should render altitude settings', () => {
      showTerrainSettings('altitude', gridInfo);

      const content = document.getElementById('settingsContent');
      expect(content?.innerHTML).toContain('Height Level');
      expect(content?.innerHTML).toContain('ft');
      expect(content?.innerHTML).toContain('heightLevel');
    });

    it('should render difficult terrain settings', () => {
      showTerrainSettings('difficult', gridInfo);

      const content = document.getElementById('settingsContent');
      expect(content?.innerHTML).toContain('Movement Multiplier');
      expect(content?.innerHTML).toContain('movementMultiplier');
      expect(content?.innerHTML).toContain('half speed');
    });

    it('should render speedy terrain settings', () => {
      showTerrainSettings('speedy', gridInfo);

      const content = document.getElementById('settingsContent');
      expect(content?.innerHTML).toContain('Movement Multiplier');
      expect(content?.innerHTML).toContain('movementMultiplier');
      expect(content?.innerHTML).toContain('double speed');
    });

    it('should render current terrain settings', () => {
      showTerrainSettings('current', gridInfo);

      const content = document.getElementById('settingsContent');
      expect(content?.innerHTML).toContain('Direction');
      expect(content?.innerHTML).toContain('direction');
      expect(content?.innerHTML).toContain('Force');
      expect(content?.innerHTML).toContain('force');
    });

    it('should render hazard terrain settings', () => {
      showTerrainSettings('hazard', gridInfo);

      const content = document.getElementById('settingsContent');
      expect(content?.innerHTML).toContain('Effect Type');
      expect(content?.innerHTML).toContain('effectType');
      expect(content?.innerHTML).toContain('Description');
      expect(content?.innerHTML).toContain('effectDescription');
    });

    it('should handle missing settings elements gracefully', () => {
      document.body.innerHTML = '';

      // Should not throw
      expect(() => showTerrainSettings('altitude', gridInfo)).not.toThrow();
    });

    it('should use default values when gridInfo is null', () => {
      showTerrainSettings('altitude', null);

      const content = document.getElementById('settingsContent');
      expect(content?.innerHTML).toContain('ft'); // Default unit
    });
  });
});
