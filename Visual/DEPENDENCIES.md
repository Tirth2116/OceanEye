# Dependencies for Trash Collection Visualizer

## Files in Visual Folder

The `Visual` folder contains:

1. **`page.tsx`** - Main visualizer component (standalone copy)
2. **`dependencies/`** - Required dependency files:
   - `utils.ts` - Utility function for className merging
   - `button.tsx` - Button component (modified imports to use local utils)

## External Dependencies (npm packages)

These must be installed via npm/pnpm:

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "next": "^16.0.0",
  "lucide-react": "^0.454.0",
  "@radix-ui/react-slot": "^1.1.1",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.5"
}
```

## Project Structure

### Working Files (Active in Next.js app):
```
app/
  └── visualizer/
      └── page.tsx          # ACTIVE - This is what runs in the app

components/
  └── ui/
      └── button.tsx        # Used by visualizer

lib/
  └── utils.ts              # Used by visualizer

components/
  └── Navbar.tsx            # Modified to add Visualizer link
```

### Reference Files (In Visual folder):
```
Visual/
  ├── page.tsx              # Copy of visualizer component
  ├── dependencies/
  │   ├── utils.ts          # Copy of lib/utils.ts
  │   └── button.tsx        # Copy of components/ui/button.tsx (modified imports)
  ├── README.md             # Documentation
  ├── CHANGES.md            # Change log
  └── DEPENDENCIES.md       # This file
```

## To Use the Visualizer

### Option 1: Use the Active Route (Recommended)
The visualizer is already integrated and working at:
- Route: `/visualizer`
- File: `app/visualizer/page.tsx`
- Just run `npm run dev` and navigate to `/visualizer`

### Option 2: Standalone Usage
If you want to use the files from the `Visual` folder:

1. Copy `Visual/page.tsx` to your Next.js app route
2. Update imports in `page.tsx`:
   ```typescript
   // Change from:
   import { Button } from "@/components/ui/button"
   import { cn } from "@/lib/utils"
   
   // To:
   import { Button } from "./dependencies/button"
   import { cn } from "./dependencies/utils"
   ```
3. Ensure all npm packages are installed
4. Ensure Tailwind CSS is configured

## Important Notes

- The **active/working** visualizer is at `app/visualizer/page.tsx`
- The `Visual` folder contains **reference copies** and documentation
- The `Visual/dependencies/` folder has local copies of required components
- The Button component in `Visual/dependencies/` has modified imports to be self-contained

## CSS/Styling

The visualizer uses Tailwind CSS classes. Ensure your project has:
- Tailwind CSS configured
- The ocean-themed custom styles from `app/globals.css`
- Proper theme configuration

The component will work with standard Tailwind, but the ocean-themed gradients and glassmorphism effects come from the main app's global CSS.

