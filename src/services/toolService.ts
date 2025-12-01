import OBR, { buildPath, buildText, Item } from "@owlbear-rodeo/sdk";
import { grid, Point } from "@davidsev/owlbear-utils";
import { CellOutliner, Command } from "../utils/CellOutliner";
import { TOOL_ID, TOOL_MODE_ID, TERRAIN_STYLES } from "../config/constants";

export async function registerTerrainTool() {
    console.log("Registering Owlbear Terrain tool");

    // State for the tool mode (in background context)
    let currentInteraction: any = null;
    const selectedCells = new Set<string>();

    await OBR.tool.create({
        id: TOOL_ID,
        shortcut: "N",
        icons: [{
            icon: "/terrain_icon.svg",
            label: "Terrain",
        }],
        defaultMode: TOOL_MODE_ID,
    });

    await OBR.tool.createMode({
        id: TOOL_MODE_ID,
        icons: [],
        async onToolDragStart(_context, event) {
            console.log('Drag start at:', event.pointerPosition);

            // Get terrain data from scene metadata
            const metadata = await OBR.scene.getMetadata();
            console.log('Scene metadata:', metadata);

            const terrainData = metadata['owlbear-terrain/pendingData'] as any;
            console.log('Terrain data:', terrainData);

            if (!terrainData) {
                console.error('No terrain data in scene metadata. Please click "Apply Terrain" first.');
                return;
            }

            const style = TERRAIN_STYLES[terrainData.type];

            // Clear previous selection
            selectedCells.clear();

            // Add starting cell
            const point = new Point(event.pointerPosition.x, event.pointerPosition.y);
            const cell = grid.getCell(point);
            const cellX = Math.floor(cell.center.x / grid.dpi);
            const cellY = Math.floor(cell.center.y / grid.dpi);
            selectedCells.add(`${cellX},${cellY}`);

            // Create initial path shape
            const shape = buildPath()
                .position({ x: cell.center.x, y: cell.center.y })
                .commands([[Command.MOVE, 0, 0], [Command.LINE, grid.dpi, 0], [Command.LINE, grid.dpi, grid.dpi], [Command.LINE, 0, grid.dpi], [Command.CLOSE]])
                .fillColor(style.fillColor)
                .fillOpacity(style.fillOpacity)
                .strokeColor(style.strokeColor)
                .strokeWidth(3)
                .strokeDash([10, 5])
                .layer("DRAWING")
                .name(`${terrainData.name} (drawing)`)
                .metadata({
                    'owlbear-terrain/type': terrainData.type,
                    'owlbear-terrain/data': terrainData,
                    'owlbear-terrain/temp': true
                })
                .build();

            console.log('Starting interaction with shape:', shape);
            try {
                currentInteraction = await OBR.interaction.startItemInteraction([shape]);
                console.log('Interaction started successfully');
            } catch (error) {
                console.error('Failed to start interaction:', error);
                throw error;
            }
        },
        async onToolDragMove(_context, event) {
            if (!currentInteraction) return;

            const point = new Point(event.pointerPosition.x, event.pointerPosition.y);
            const cell = grid.getCell(point);
            const cellX = Math.floor(cell.center.x / grid.dpi);
            const cellY = Math.floor(cell.center.y / grid.dpi);
            const cellKey = `${cellX},${cellY}`;
            selectedCells.add(cellKey);

            const [update] = currentInteraction;
            update((items: any[]) => {
                if (items.length > 0 && selectedCells.size > 0) {
                    // Convert cells to path
                    const cells = Array.from(selectedCells).map(key => {
                        const [x, y] = key.split(',').map(Number);
                        const cellPoint = new Point(x * grid.dpi, y * grid.dpi);
                        return grid.getCell(cellPoint);
                    });

                    const outliner = new CellOutliner(cells);
                    const commands = outliner.getOutlinePath();

                    if (commands.length > 0) {
                        // Calculate bounds
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        for (const loop of outliner.outline) {
                            for (const point of loop) {
                                minX = Math.min(minX, point.x);
                                minY = Math.min(minY, point.y);
                                maxX = Math.max(maxX, point.x);
                                maxY = Math.max(maxY, point.y);
                            }
                        }

                        // Normalize commands to be relative to position
                        const normalizedCommands = commands.map(cmd => {
                            const newCmd = [...cmd];
                            if (newCmd[0] === Command.MOVE || newCmd[0] === Command.LINE) {
                                newCmd[1] -= minX;
                                newCmd[2] -= minY;
                            }
                            return newCmd;
                        });

                        // Update path - PATH items don't have width/height, bounds are calculated from commands
                        items[0].position = { x: minX, y: minY };
                        items[0].commands = normalizedCommands;
                    }
                }
            });
        },
        async onToolDragEnd(_context, _event) {
            console.log('Drag end, cells:', selectedCells.size);

            if (!currentInteraction) return;

            const [update, stop] = currentInteraction;

            // Only add items if we have enough cells
            if (selectedCells.size > 0) {
                // Do a final update to finalize the items
                const items = update((items: any[]) => {
                    if (items.length > 0) {
                        delete items[0].metadata['owlbear-terrain/temp'];
                        // Update style: transparent fill with thick dark grey stroke
                        items[0].style.strokeDash = [];
                        items[0].style.fillOpacity = 0; // Make fill transparent
                        items[0].style.strokeColor = '#404040'; // Dark grey
                        items[0].style.strokeWidth = 16; // Thick stroke
                        items[0].metadata['owlbear-terrain/cellCount'] = selectedCells.size;
                    }
                });

                console.log('Adding terrain items to scene, count:', items.length);
                console.log('Item details:', JSON.stringify(items[0], null, 2));

                // Add items to scene before stopping interaction
                if (items.length > 0) {
                    try {
                        const terrainData = items[0].metadata['owlbear-terrain/data'] as any;
                        const itemsToAdd: Item[] = [items[0]];

                        // If it's altitude terrain, add a text label showing the height
                        if (terrainData && terrainData.type === 'altitude' && terrainData.heightLevel !== undefined) {
                            const heightValue = terrainData.heightLevel;
                            const heightText = heightValue >= 0 ? `+${heightValue}` : `${heightValue}`;

                            const label = buildText()
                                .position({ x: items[0].position.x + 5, y: items[0].position.y + 5 })
                                .plainText(heightText)
                                .textType('PLAIN')
                                .fontWeight(700)
                                .fontSize(32)
                                .width(60)
                                .height(40)
                                .strokeColor('#000000')
                                .strokeWidth(3)
                                .textAlign('LEFT')
                                .textAlignVertical('TOP')
                                .fillColor('#FFFFFF')
                                .metadata({
                                    'owlbear-terrain/type': 'altitude-label',
                                    'owlbear-terrain/parentId': items[0].id
                                })
                                .locked(true)
                                .layer('TEXT')
                                .name(`${terrainData.name} (label)`)
                                .attachedTo(items[0].id)
                                .build();

                            itemsToAdd.push(label);
                        }

                        await OBR.scene.items.addItems(itemsToAdd);
                        console.log('Items added successfully');
                    } catch (error) {
                        console.error('Failed to add items:', error);
                        console.error('Error details:', JSON.stringify(error, null, 2));
                    }
                }
            }

            // Stop the interaction (this removes temporary items)
            stop();
            currentInteraction = null;
            selectedCells.clear();
        },
        async onToolDragCancel() {
            if (currentInteraction) {
                const [, stop] = currentInteraction;
                stop();
                currentInteraction = null;
            }
            selectedCells.clear();
        }
    });

    console.log("Terrain tool registered");
}
