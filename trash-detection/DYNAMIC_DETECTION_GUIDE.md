# Dynamic Trash Detection Guide

## Overview
The trash detection system is now **fully dynamic** with no hardcoded data. When your video analyzer detects new trash, it will automatically appear in the dashboard UI with all analysis details.

## How It Works

1. **Python Analyzer** detects trash and gets Gemini analysis (JSON with all details)
2. **Crop Image** is saved to `.trash_crops/`
3. **Send to Dashboard** via API endpoint
4. **Dashboard** polls every 2 seconds and displays new detections
5. **Click Detection** to see full analysis with 4 color-coded sections

## Quick Start

### 1. Start Your Dashboard
```cmd
npm run dev
```
Dashboard runs at `http://localhost:3000`

### 2. Run Your Analyzer
```cmd
call .venv\Scripts\activate.bat
set "GEMINI_API_KEY=AIzaSyAQVWip_MOsomzbHgdJDmYHvqO2uZ_suIw"
python trash_analyzer.py bottlewater.jpeg --debug --crops-dir .trash_crops
```

### 3. Send Detection to Dashboard

**Option A: Using the helper script (easiest)**
```cmd
pip install requests

python send_to_dashboard.py ^
  .trash_crops\crop_0_137_90.png ^
  "{\"label\":\"Plastic bottle\",\"threat_level\":\"High\",\"decomposition_years\":450,\"environmental_impact\":\"...\",\"disposal_instructions\":\"...\",\"probable_source\":\"...\"}" ^
  --confidence 94 ^
  --location "Zone A-3" ^
  --size Medium
```

**Option B: Using curl**
```cmd
curl -X POST http://localhost:3000/api/detections ^
  -H "Content-Type: application/json" ^
  -d "{\"trashType\":\"Plastic bottle\",\"threatLevel\":\"High\",\"decompositionYears\":450,\"environmentalImpact\":\"...\",\"disposalInstructions\":\"...\",\"probableSource\":\"...\",\"image\":\"/detections/crop.png\",\"confidence\":94,\"location\":\"Zone A-3\",\"size\":\"Medium\"}"
```

**Option C: Direct Python (in your analyzer script)**
```python
import requests
import json
import shutil
from pathlib import Path

def send_to_dashboard(crop_path, gemini_json_data):
    # Copy image to public directory
    public_dir = Path("public/detections")
    public_dir.mkdir(parents=True, exist_ok=True)
    
    import time
    timestamp = int(time.time() * 1000)
    public_filename = f"detection_{timestamp}.png"
    shutil.copy2(crop_path, public_dir / public_filename)
    
    # Send to API
    payload = {
        "trashType": gemini_json_data["label"],
        "threatLevel": gemini_json_data["threat_level"],
        "decompositionYears": gemini_json_data["decomposition_years"],
        "environmentalImpact": gemini_json_data["environmental_impact"],
        "disposalInstructions": gemini_json_data["disposal_instructions"],
        "probableSource": gemini_json_data["probable_source"],
        "image": f"/detections/{public_filename}",
        "confidence": 94,
        "location": "Zone A-3",
        "size": "Medium"
    }
    
    response = requests.post("http://localhost:3000/api/detections", json=payload)
    if response.ok:
        print(f"✓ Sent to dashboard: {payload['trashType']}")
    else:
        print(f"✗ Failed to send: {response.status_code}")
```

## API Endpoints

### GET /api/detections
Get all current detections.

**Response:**
```json
{
  "detections": [...],
  "count": 3
}
```

### POST /api/detections
Add a new detection.

**Request Body:**
```json
{
  "trashType": "Plastic bottle",
  "threatLevel": "High",
  "decompositionYears": 450,
  "environmentalImpact": "Detailed impact description...",
  "disposalInstructions": "Recycling instructions...",
  "probableSource": "Source description...",
  "image": "/detections/detection_123.png",
  "confidence": 94,
  "location": "Zone A-3",
  "size": "Medium"
}
```

**Response:**
```json
{
  "success": true,
  "detection": { ... }
}
```

### DELETE /api/detections
Clear all detections.

**Response:**
```json
{
  "success": true,
  "message": "All detections cleared"
}
```

## Dashboard Features

### Empty State
When no detections exist:
- Shows camera icon
- Message: "Waiting for video analyzer to detect new objects..."
- Live monitoring indicator

### Detection List
When detections exist:
- Shows count: "3 objects found"
- Compact cards with:
  - Cropped image
  - Threat level badge (color-coded)
  - Confidence percentage
  - Timestamp, location, decomposition years
  - Size indicator
- Click to expand

### Detailed View
When you click a detection:
- Full-size image
- 4 color-coded analysis sections:
  - 🟧 **Decomposition Estimate** (orange, hourglass icon)
  - 🟥 **Environmental Threat** (red, warning icon)
  - 🟩 **Recycling/Disposal** (green, recycle icon)
  - 🟦 **Probable Source** (blue, map pin icon)
- X button to go back to list

### Auto-Refresh
Dashboard polls `/api/detections` every 2 seconds to show new detections automatically.

## Data Flow

```
┌─────────────────┐
│  Video Analyzer │
│  (Python)       │
└────────┬────────┘
         │ detects trash
         ▼
┌─────────────────┐
│ segment(image)  │
│ returns masks   │
└────────┬────────┘
         │ new centroid
         ▼
┌─────────────────┐
│ Gemini Vision   │
│ API (JSON)      │
└────────┬────────┘
         │ full analysis
         ▼
┌─────────────────┐
│ Save crop image │
│ to public/      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/      │
│ detections      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ In-memory store │
│ (server-side)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dashboard polls │
│ every 2s        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UI updates with │
│ new detection   │
└─────────────────┘
```

## Testing

### Test the API manually:
```cmd
REM Clear all detections
curl -X DELETE http://localhost:3000/api/detections

REM Add a test detection
curl -X POST http://localhost:3000/api/detections ^
  -H "Content-Type: application/json" ^
  -d "{\"trashType\":\"Test Bottle\",\"threatLevel\":\"High\",\"decompositionYears\":450,\"environmentalImpact\":\"Test impact\",\"disposalInstructions\":\"Test disposal\",\"probableSource\":\"Test source\",\"image\":\"/placeholder.svg\",\"confidence\":95,\"location\":\"Test Zone\",\"size\":\"Medium\"}"

REM Get all detections
curl http://localhost:3000/api/detections
```

### Expected Result:
- Dashboard shows "1 object found"
- Card appears with "Test Bottle"
- Click to see full details

## Integration with Your Video Analyzer

When you have your real segmentation model ready:

1. **Detect new object** (centroid tracking already works)
2. **Get Gemini analysis** (already returns JSON)
3. **Copy crop to public** directory
4. **Call API** to add detection

```python
# In your analyzer after getting Gemini response:
import json
import requests
import shutil
from pathlib import Path

# Parse Gemini JSON
gemini_data = json.loads(clean_gemini_response)

# Copy crop to public directory
public_dir = Path("public/detections")
public_dir.mkdir(parents=True, exist_ok=True)
dest = public_dir / crop_path.name
shutil.copy2(crop_path, dest)

# Send to dashboard
requests.post("http://localhost:3000/api/detections", json={
    "trashType": gemini_data["label"],
    "threatLevel": gemini_data["threat_level"],
    "decompositionYears": gemini_data["decomposition_years"],
    "environmentalImpact": gemini_data["environmental_impact"],
    "disposalInstructions": gemini_data["disposal_instructions"],
    "probableSource": gemini_data["probable_source"],
    "image": f"/detections/{crop_path.name}",
    "confidence": 94,  # From your model
    "location": "Zone A-3",  # From camera metadata
    "size": "Medium"  # Calculate from mask area
})
```

## Notes

- **Images**: Must be in `public/detections/` directory to be accessible by Next.js
- **Persistence**: Detections are stored in-memory (cleared on server restart)
- **Performance**: Dashboard polls every 2 seconds; adjust in `components/dashboard-view.tsx` if needed
- **Scaling**: For production, consider using WebSockets or Server-Sent Events instead of polling

## Next Steps

1. Run your video analyzer on multiple images
2. Each new detection will automatically appear in the dashboard
3. Click detections to see full Gemini analysis
4. No more hardcoded data - it's all dynamic!

