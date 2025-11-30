# Owlbear Terrain - Agent Configuration

This file configures GitHub Copilot agents for the Owlbear Terrain extension project.

## Project Overview

Owlbear Terrain is an extension for Owlbear Rodeo that adds advanced terrain features to enhance virtual tabletop gameplay. The extension supports:

- **Altitude/Height**: Define different elevation levels for terrain
- **Difficult Terrain**: Areas that slow movement (e.g., forests, rubble)
- **Speedy Terrain**: Areas that enhance movement (e.g., roads, ice)
- **Currents**: Directional forces that push tokens (e.g., water currents, wind)
- **Hazards**: Terrain that triggers effects like damage or saving throws

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Build Tool**: Vite
- **SDK**: Owlbear Rodeo SDK (@owlbear-rodeo/sdk)
- **Package Manager**: pnpm

## Project Structure

```
owlbear_terrain/
├── src/
│   └── main.js          # Main application logic with OBR SDK integration
├── index.html           # Extension UI
├── style.css            # Styling
├── manifest.json        # Owlbear extension manifest
├── icon.svg             # Extension icon
├── package.json         # Dependencies and scripts
└── README.md           # Project documentation
```

## Development Guidelines

### Code Style
- Use modern JavaScript (ES6+ features)
- Follow consistent naming conventions (camelCase for variables/functions)
- Keep functions focused and single-purpose
- Use async/await for asynchronous operations

### Owlbear SDK Usage
- Always wait for `OBR.onReady()` before SDK operations
- Use `OBR.scene.setMetadata()` and `OBR.scene.getMetadata()` for persisting data
- Follow the namespace pattern `owlbear-terrain/` for metadata keys
- Handle SDK errors gracefully

### UI/UX Considerations
- Extension runs in a popover (350x400px)
- Dark theme to match Owlbear Rodeo
- Mobile-friendly touch targets
- Clear visual feedback for user actions

## Testing

When testing changes:
1. Run `pnpm install` to install dependencies
2. Run `pnpm run dev` for development server
3. Run `pnpm run build` to create production build
4. Test in Owlbear Rodeo using the local development server or by loading the built extension

## Common Tasks

### Adding a New Terrain Type
1. Add button to `index.html` in the terrain-options section
2. Add case to `showTerrainSettings()` in `main.js`
3. Add case to `applyTerrain()` for data collection
4. Add case to `getTerrainDetails()` for display

### Modifying Terrain Data Structure
1. Update the terrain data object in `applyTerrain()`
2. Update display logic in `getTerrainDetails()`
3. Ensure backward compatibility with existing saved terrain

## Resources

- [Owlbear Rodeo SDK Documentation](https://github.com/owlbear-rodeo/sdk)
- [Extension Tutorial](https://docs.owlbear.rodeo/extensions/tutorial-hello-world/)
- [Getting Started Guide](https://docs.owlbear.rodeo/extensions/getting-started/)
- [Example Extension](https://github.com/Croebh/owlbear-distances)
