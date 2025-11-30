import OBR from "@owlbear-rodeo/sdk";

export interface GridInfo {
    dpi: number;
    scale: {
        multiplier: number;
        unit: string;
    };
    type: string;
    measurement: string;
}

export async function loadGridInfo(): Promise<GridInfo | null> {
    try {
        const isReady = await OBR.scene.isReady();
        if (!isReady) return null;

        const dpi = await OBR.scene.grid.getDpi();
        const scale = await OBR.scene.grid.getScale();
        const type = await OBR.scene.grid.getType();
        const measurement = await OBR.scene.grid.getMeasurement();

        const gridInfo = {
            dpi,
            scale: scale.parsed,
            type,
            measurement
        };

        console.log('Grid info loaded:', gridInfo);
        return gridInfo;
    } catch (error) {
        console.log('Could not load grid info:', error);
        return null;
    }
}

export function updateGridDisplay(gridInfo: GridInfo | null) {
    const container = document.getElementById('gridInfo');
    if (!container || !gridInfo) return;

    const gridTypeDisplay = gridInfo.type.replace(/_/g, ' ').toLowerCase();
    const scaleDisplay = `${gridInfo.scale.multiplier}${gridInfo.scale.unit}`;

    container.innerHTML = `
        <div class="grid-info-item">
            <span class="grid-info-label">Grid:</span>
            <span class="grid-info-value">${gridTypeDisplay}, ${scaleDisplay} per cell</span>
        </div>
    `;
    container.style.display = 'block';
}
