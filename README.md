# Owlbear Terrain

An Owlbear Rodeo extension that supports more detailed terrain features and movement control, including:
- **Movement Constraint**: Grid-based one-square-at-a-time movement control for players
- **Altitude/Heights**: Define different elevation levels for terrain
- **Difficult Terrain**: Areas that slow movement (forests, rubble, etc.)
- **Speedy Terrain**: Areas that enhance movement (roads, ice, etc.)
- **Currents**: Directional forces that push tokens (water currents, wind, etc.)
- **Hazard Terrain**: Terrain that triggers effects like saving throws or damage

## Features

- **Movement Control**: Enforce grid-based movement constraints for player tokens
  - Players can only move one grid square at a time
  - Adjacent squares (including diagonals) are highlighted
  - Click-to-move interface for controlled movement
  - Supports both square and hex grids
- Easy-to-use interface integrated with Owlbear Rodeo
- Support for multiple terrain types with customizable properties
- Persistent terrain data saved with your scene
- Visual feedback and terrain management

## Installation

### For Development

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm run dev
   ```
4. In Owlbear Rodeo, add the extension using the local development URL (typically `http://localhost:3000`)

### For Production

1. Build the extension:
   ```bash
   pnpm run build
   ```
2. Host the `dist` folder on a web server
3. Add the extension to Owlbear Rodeo using your hosted URL

## Usage

### Movement Control

1. Open the Terrain Tools extension in Owlbear Rodeo
2. Click "Activate Movement Mode (M)" or press the M key
3. Click on a player-owned token to select it
4. Adjacent grid cells will be highlighted in green
5. Click on a highlighted cell to move the token there
6. Continue clicking adjacent cells to move one square at a time
7. Click outside the highlighted area to deselect
8. Press M or click the Movement icon in the toolbar to exit movement mode

### Terrain Tools

1. Open the Terrain Tools extension in Owlbear Rodeo
2. Select a terrain type (Altitude, Difficult Terrain, Speedy Terrain, Current, or Hazard)
3. Configure the terrain properties in the settings panel
4. Click "Apply Terrain" to add it to your scene
5. Manage active terrain areas in the "Active Terrain" section

## Terrain Types

### Altitude
Define elevation levels for terrain features like hills, cliffs, or flying creatures.
- **Height Level**: Set the altitude in feet

### Difficult Terrain
Create areas that slow movement, such as forests, rubble, or mud.
- **Movement Multiplier**: 0.1-1.0 (0.5 = half speed)

### Speedy Terrain
Create areas that enhance movement, such as roads or magical speed zones.
- **Movement Multiplier**: 1.0-5.0 (2.0 = double speed)

### Current
Add directional forces like water currents or wind.
- **Direction**: 0-360 degrees
- **Force**: Movement distance in feet per round

### Hazard
Define terrain that triggers effects when entered.
- **Effect Type**: Damage, Saving Throw, or Condition
- **Description**: Details of the effect (e.g., "1d6 fire damage")

## Technical Details

Built with:
- TypeScript
- Owlbear Rodeo SDK
- Vite for building and development
- Vitest for testing

### Project Structure

```
src/
├── config/           # Configuration and constants
│   └── constants.ts  # Tool IDs and terrain styles
├── services/         # Business logic services
│   ├── gridService.ts         # Grid information management
│   ├── terrainService.ts      # Terrain operations
│   ├── toolService.ts         # Tool registration and drawing
│   ├── movementService.ts     # Movement constraint logic
│   └── movementToolService.ts # Movement tool registration
├── ui/               # User interface components
│   └── terrainUI.ts  # UI components and form handling
├── utils/            # Utility functions
│   └── CellOutliner.ts  # Cell outlining algorithm
└── tests/            # Unit tests
    ├── gridService.test.ts
    ├── terrainService.test.ts
    ├── terrainUI.test.ts
    └── movementService.test.ts
```

### Development

Run tests:
```bash
pnpm test        # Run tests in watch mode
pnpm test:run    # Run tests once
pnpm test:ui     # Run tests with UI
```

## License

MIT
