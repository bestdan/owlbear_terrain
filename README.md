# Owlbear Terrain

An Owlbear Rodeo extension that supports more detailed terrain features, including:
- **Altitude/Heights**: Define different elevation levels for terrain
- **Difficult Terrain**: Areas that slow movement (forests, rubble, etc.)
- **Speedy Terrain**: Areas that enhance movement (roads, ice, etc.)
- **Currents**: Directional forces that push tokens (water currents, wind, etc.)
- **Hazard Terrain**: Terrain that triggers effects like saving throws or damage

## Features

- Easy-to-use interface integrated with Owlbear Rodeo
- Support for multiple terrain types with customizable properties
- Persistent terrain data saved with your scene
- Visual feedback and terrain management

## Installation

### For Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. In Owlbear Rodeo, add the extension using the local development URL (typically `http://localhost:3000`)

### For Production

1. Build the extension:
   ```bash
   npm run build
   ```
2. Host the `dist` folder on a web server
3. Add the extension to Owlbear Rodeo using your hosted URL

## Usage

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
- Vanilla JavaScript (ES6+)
- Owlbear Rodeo SDK
- Vite for building and development

## License

MIT
