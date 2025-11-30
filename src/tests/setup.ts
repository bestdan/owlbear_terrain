// Test setup file
import { beforeEach, vi } from 'vitest';

// Mock the @owlbear-rodeo/sdk module
vi.mock('@owlbear-rodeo/sdk', () => {
  const mockOBR = {
    scene: {
      isReady: vi.fn().mockResolvedValue(true),
      getMetadata: vi.fn().mockResolvedValue({}),
      setMetadata: vi.fn().mockResolvedValue(undefined),
      grid: {
        getDpi: vi.fn().mockResolvedValue(150),
        getScale: vi.fn().mockResolvedValue({ parsed: { multiplier: 5, unit: 'ft' } }),
        getType: vi.fn().mockResolvedValue('SQUARE'),
        getMeasurement: vi.fn().mockResolvedValue('5ft'),
      },
      items: {
        getItems: vi.fn().mockResolvedValue([]),
        addItems: vi.fn().mockResolvedValue([]),
        deleteItems: vi.fn().mockResolvedValue(undefined),
      },
    },
    tool: {
      create: vi.fn().mockResolvedValue(undefined),
      createMode: vi.fn().mockResolvedValue(undefined),
      activateTool: vi.fn().mockResolvedValue(undefined),
      getActiveTool: vi.fn().mockResolvedValue(null),
    },
    notification: {
      show: vi.fn().mockReturnValue(undefined),
    },
    interaction: {
      startItemInteraction: vi.fn().mockResolvedValue([vi.fn(), vi.fn()]),
    },
    onReady: vi.fn((callback) => callback()),
  };

  return {
    default: mockOBR,
    buildPath: vi.fn().mockReturnValue({
      position: vi.fn().mockReturnThis(),
      commands: vi.fn().mockReturnThis(),
      fillColor: vi.fn().mockReturnThis(),
      fillOpacity: vi.fn().mockReturnThis(),
      strokeColor: vi.fn().mockReturnThis(),
      strokeWidth: vi.fn().mockReturnThis(),
      strokeDash: vi.fn().mockReturnThis(),
      layer: vi.fn().mockReturnThis(),
      name: vi.fn().mockReturnThis(),
      metadata: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({}),
    }),
    buildText: vi.fn().mockReturnValue({
      position: vi.fn().mockReturnThis(),
      plainText: vi.fn().mockReturnThis(),
      textType: vi.fn().mockReturnThis(),
      fontWeight: vi.fn().mockReturnThis(),
      fontSize: vi.fn().mockReturnThis(),
      width: vi.fn().mockReturnThis(),
      height: vi.fn().mockReturnThis(),
      strokeColor: vi.fn().mockReturnThis(),
      strokeWidth: vi.fn().mockReturnThis(),
      textAlign: vi.fn().mockReturnThis(),
      textAlignVertical: vi.fn().mockReturnThis(),
      fillColor: vi.fn().mockReturnThis(),
      metadata: vi.fn().mockReturnThis(),
      locked: vi.fn().mockReturnThis(),
      layer: vi.fn().mockReturnThis(),
      name: vi.fn().mockReturnThis(),
      attachedTo: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({}),
    }),
  };
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});
