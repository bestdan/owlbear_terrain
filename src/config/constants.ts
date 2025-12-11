// Tool identifiers
export const TOOL_ID = "owlbear-terrain/tool";
export const TOOL_MODE_ID = "owlbear-terrain/draw-mode";
export const MOVEMENT_TOOL_ID = "owlbear-terrain/movement-tool";
export const MOVEMENT_MODE_ID = "owlbear-terrain/movement-mode";

// Terrain type colors and styles
export const TERRAIN_STYLES: Record<string, { fillColor: string, strokeColor: string, fillOpacity: number }> = {
    altitude: { fillColor: '#87CEEB', strokeColor: '#4682B4', fillOpacity: 0.3 },
    difficult: { fillColor: '#8B4513', strokeColor: '#654321', fillOpacity: 0.3 },
    speedy: { fillColor: '#32CD32', strokeColor: '#228B22', fillOpacity: 0.3 },
    current: { fillColor: '#00CED1', strokeColor: '#008B8B', fillOpacity: 0.3 },
    hazard: { fillColor: '#FF4500', strokeColor: '#8B0000', fillOpacity: 0.3 }
};
