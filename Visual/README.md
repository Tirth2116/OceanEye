# Trash Collection Visualizer

This folder contains the complete implementation of the AI-powered trash detection visualization system.

## Files

- **`page.tsx`** - Main visualizer component with all functionality
- **`dependencies/`** - Required dependency files:
  - `utils.ts` - Utility function for className merging
  - `button.tsx` - Button component (self-contained version)
- **`DEPENDENCIES.md`** - Complete dependency documentation


## Features

### Input Formats

1. **Array Format** - Explicit coordinates:
   ```json
   [
     { "id": "plastic-01", "x": 40, "y": 60, "type": "trash_plastic" },
     { "id": "metal-01", "x": 52, "y": 80, "type": "trash_metal" }
   ]
   ```

2. **Dictionary Format** - Count-based with deterministic randomization:
   ```json
   {
     "trash_plastic": 4,
     "trash_metal": 2,
     "trash_paper": 1
   }
   ```

### Key Features

- **Deterministic Randomization**: Same dictionary input always produces the same layout
- **Smooth Pathfinding**: Nearest-neighbor + 2-opt optimization with Catmull-Rom spline smoothing
- **Adaptive Animation**: Always completes in 10 seconds regardless of trash count
- **Environment Detection**: Automatically switches between underwater/land backgrounds
- **Icon System**: Visual icons for each trash type (plastic bottle, metal can, etc.)

## Trash Types

The system supports 16 different types:

- `rov` - Robot/collector starting point
- `plant` - Plant life
- `animal_fish`, `animal_starfish`, `animal_shells`, `animal_crab`, `animal_eel`, `animal_etc` - Marine life
- `trash_etc`, `trash_fabric`, `trash_fishing_gear`, `trash_metal`, `trash_paper`, `trash_plastic`, `trash_rubber`, `trash_wood` - Trash types

## Algorithm Details

### Path Planning
1. **Nearest Neighbor**: Starts from ROV, always picks closest unvisited target
2. **2-Opt Refinement**: Locally optimizes route by swapping segments
3. **Spline Smoothing**: Uses Catmull-Rom splines for natural curved paths

### Deterministic Randomization
- Uses FNV-1a hash function to create seed from dictionary
- Mulberry32 PRNG for random number generation
- Each point gets unique seed: `baseSeed:globalIndex`
- Ensures reproducibility while maintaining randomness

## Dependencies

This component requires:
- React 19+
- Next.js 16+
- `lucide-react` for icons
- `@/components/ui/button` (shadcn/ui)
- `@/lib/utils` (cn utility)

## Usage in Next.js

The actual route is at `app/visualizer/page.tsx`. This folder contains a copy for reference.

To use:
1. Navigate to `/visualizer` in your Next.js app
2. Paste detection data (array or dictionary format)
3. Click "Apply Data"
4. Click "Play" to start animation

## Testing

### Test Case 1 - Dictionary Format:
```json
{
  "trash_plastic": 4,
  "trash_metal": 2,
  "trash_paper": 1,
  "trash_fabric": 1,
  "trash_wood": 1,
  "trash_fishing_gear": 1
}
```

### Test Case 2 - Array Format:
```json
[
  { "id": "rov-base", "x": 12, "y": 18, "type": "rov" },
  { "id": "plastic-01", "x": 40, "y": 65, "type": "trash_plastic" },
  { "id": "metal-01", "x": 72, "y": 30, "type": "trash_metal" },
  { "id": "paper-01", "x": 25, "y": 80, "type": "trash_paper" },
  { "id": "fabric-01", "x": 58, "y": 92, "type": "trash_fabric" },
  { "id": "rubber-01", "x": 83, "y": 55, "type": "trash_rubber" },
  { "id": "wood-01", "x": 15, "y": 52, "type": "trash_wood" },
  { "id": "gear-01", "x": 68, "y": 78, "type": "trash_fishing_gear" },
  { "id": "misc-01", "x": 92, "y": 20, "type": "trash_etc" },
  { "id": "plastic-02", "x": 34, "y": 40, "type": "trash_plastic" },
  { "id": "metal-02", "x": 55, "y": 12, "type": "trash_metal" }
]
```

## Notes

- The actual working file is at `app/visualizer/page.tsx` (Next.js route)
- This folder (`Visual/`) contains a reference copy
- The component is fully self-contained in a single file
- Canvas-based rendering for smooth 60fps animation
- Responsive design with automatic canvas scaling

