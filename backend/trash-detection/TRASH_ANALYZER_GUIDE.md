# Trash Analyzer Setup Guide

## Overview
Your trash analyzer now detects new trash objects, crops them, and gets comprehensive environmental analysis from Gemini AI including:
- Trash type classification
- Threat level (Low/Medium/High/Critical)
- Decomposition time in years
- Environmental impact details
- Recycling/disposal instructions
- Probable source attribution

## Environment Setup

### API Key Storage
Your Gemini API key is stored in `config.env`:
```
GEMINI_API_KEY=AIzaSyAQVWip_MOsomzbHgdJDmYHvqO2uZ_suIw
```

### Setting the Key

**Option 1: Use config.env file**
```cmd
REM The key is already in config.env
REM Python scripts will read from GEMINI_API_KEY environment variable
```

**Option 2: Set permanently in Windows**
```cmd
setx GEMINI_API_KEY "AIzaSyAQVWip_MOsomzbHgdJDmYHvqO2uZ_suIw"
```
Then close and reopen your terminal.

**Option 3: Set for current session only (cmd)**
```cmd
set "GEMINI_API_KEY=AIzaSyAQVWip_MOsomzbHgdJDmYHvqO2uZ_suIw"
```

**Option 4: Pass via CLI**
```cmd
python trash_analyzer.py image.jpg --api-key "AIzaSyAQVWip_MOsomzbHgdJDmYHvqO2uZ_suIw"
```

## Python Environment

### Activate venv
```cmd
call .venv\Scripts\activate.bat
```

### Installed Dependencies
- numpy
- pillow
- google-generativeai

## Running the Analyzer

### Basic Usage
```cmd
python trash_analyzer.py path\to\image.jpg
```

### With Debug (recommended)
Shows full JSON response and saves cropped images:
```cmd
python trash_analyzer.py path\to\image.jpg --debug --crops-dir .trash_crops
```

### Command Line Options
```
python trash_analyzer.py IMAGE [options]

Options:
  --threshold PIXELS      Distance threshold for "new" objects (default: 40)
  --seen-store FILE       JSON file to track seen centroids (default: .trash_analyzer_seen.json)
  --debug                 Print detailed debug info
  --crops-dir DIR         Save cropped images to this directory
  --api-key KEY           Gemini API key (overrides env var)
  --api-key-file FILE     Read API key from file
```

### Example Session
```cmd
REM Activate venv
call .venv\Scripts\activate.bat

REM Set API key for this session
set "GEMINI_API_KEY=AIzaSyAQVWip_MOsomzbHgdJDmYHvqO2uZ_suIw"

REM Run analyzer with debug
python trash_analyzer.py bottlewater.jpeg --debug --crops-dir .trash_crops

REM Clear seen objects to reprocess same image
del .trash_analyzer_seen.json
```

## Output

### Console Output
```
Object 0 centroid=(137.01, 90.99) bbox=(0, 0, 274, 182) area(px)=50314
Saved crop: .trash_crops\crop_0_137_90.png
Gemini prompt: Analyze this trash item...
Gemini raw response: {
  "label": "Plastic bottle",
  "threat_level": "High",
  "decomposition_years": 450,
  ...
}
NEW object at (137.01, 90.99): Plastic bottle
```

### Saved Files
- **Cropped images**: `.trash_crops\crop_<id>_<cx>_<cy>.png`
- **Seen objects**: `.trash_analyzer_seen.json` (tracks centroids to avoid redetecting)

## Segmentation Function

The analyzer expects a `segment(image)` function. Currently using a stub in `segment.py`.

**To use your real model:**
1. Replace the `segment()` function in `segment.py`, OR
2. Create a `segmenter.py` file with your `segment()` function, OR
3. Update the import at the top of `trash_analyzer.py`

**Expected format:**
```python
def segment(image):
    """
    Args:
        image: PIL Image or numpy array (H, W, 3)
    
    Returns:
        List of masks, where each mask is:
        - numpy array shape (H, W)
        - values: 1 where object exists, 0 elsewhere
    """
    return [mask1, mask2, ...]  # list of binary masks
```

## UI Integration

### Dashboard Components

**New Trash Detection Log** (`components/new-trash-detection-log.tsx`)
- Shows list of detected trash items
- Click any item to see full analysis with:
  - Decomposition estimate (with hourglass icon, orange accent)
  - Environmental threat assessment (with warning icon, red accent)
  - Recycling/disposal instructions (with recycle icon, green accent)
  - Probable source attribution (with map pin icon, blue accent)
- Color-coded threat levels
- Real-time monitoring indicator

**Data Structure**
```typescript
interface TrashDetection {
  id: number
  timestamp: string
  image: string
  trashType: string
  confidence: number
  location: string
  size: string
  threatLevel: "Low" | "Medium" | "High" | "Critical"
  decompositionYears: number
  environmentalImpact: string
  disposalInstructions: string
  probableSource: string
}
```

## Next Steps

1. **Replace stub segmentation** with your real model
2. **Integrate with dashboard** by:
   - Calling `trash_analyzer.py` from your backend
   - Parsing the JSON output
   - Updating the React components with live data
3. **Optional enhancements**:
   - Save analysis JSON to database
   - Add timestamp-based filtering
   - Export analysis reports
   - Add overlay visualization showing mask on original image

## Troubleshooting

### "No new objects found"
- The object was already seen. Delete `.trash_analyzer_seen.json` to reset.
- Increase `--threshold` if objects are too close together.

### "GEMINI_API_KEY not set"
- Check: `echo %GEMINI_API_KEY%`
- Set it using one of the methods above

### "segment() function not found"
- Make sure `segment.py` exists with a `segment()` function
- Or adjust the import in `trash_analyzer.py` line 30-36

### Model 404 error
- The script now uses `models/gemini-2.5-flash` (latest)
- If still failing, check available models:
  ```python
  import google.generativeai as genai
  genai.configure(api_key="YOUR_KEY")
  for m in genai.list_models():
      if 'generateContent' in m.supported_generation_methods:
          print(m.name)
  ```

## Security Note

⚠️ **Never commit API keys to git**
- `config.env` is gitignored
- `.env*` files are gitignored
- Always use environment variables or secure key management in production

