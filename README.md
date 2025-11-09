## OceanEye — AI-Powered Marine Debris Detection (Hackathon Edition)

A full‑stack prototype that detects ocean trash from images/video, analyzes environmental impact with Gemini, and streams results live to a Next.js dashboard. Built for rapid demos: plug in a frame, get an object crop, classify it, and watch your dashboard update in real-time.

### Why it matters
- Plastic and fishing waste threaten marine ecosystems and coastal economies.
- OceanHub helps responders visualize hotspots, understand risk/severity, and prioritize cleanup.


## Demo TL;DR (5–8 minutes)

1) Start the dashboard:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000

2) Prepare Python env:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

3) Export your Gemini key (don’t commit keys):
```bash
export GEMINI_API_KEY="YOUR_KEY"          # macOS/Linux
# PowerShell: $env:GEMINI_API_KEY="YOUR_KEY"
```

4) Run the analyzer on a sample image (saves crops; classifies with Gemini):
```bash
cd backend/trash-detection
python trash_analyzer.py ../bottlewater.jpeg --debug --crops-dir .trash_crops
```
Watch logs; a crop is saved and classified. The dashboard should update within 2 seconds.

5) (Optional) Send a synthetic detection for a guaranteed demo card:
```bash
python test_detection.py
```

6) Clear detections from the UI when done:
```bash
python clear_detections.py
```

Talking points while it runs:
- “We detect object masks → crop → classify with Gemini → POST to dashboard → live list updates.”
- “Threat level + decomposition years + disposal instructions are AI‑generated for quick actionability.”


## Architecture

### High level
- Backend (Python)
  - Segmentation: `segment.py` (stub) or `yolo_segment.py` (Ultralytics YOLOv8 segmentation).
  - Analyzer: `trash_analyzer.py` finds new objects via centroid distance, crops ROIs, and calls Gemini.
  - Utility scripts: `test_detection.py`, `send_to_dashboard.py`, `clear_detections.py`.
- Frontend (Next.js)
  - Simple API store (`/api/detections`) in memory for hackathon speed.
  - React UI polls every 2s and renders a compact list + detailed view.

### Data flow
1) Analyzer loads an image (or frame) and runs `segment(image)` → masks.
2) For each mask: compute centroid → if “new”, crop ROI and classify with Gemini Vision.
3) Copy crop into `frontend/public/detections/…` and POST metadata to `/api/detections`.
4) Dashboard polls and renders new detections immediately.


## Repository layout

```
OceanHub/
├─ backend/
│  ├─ main.py                         # (Other backend logic/tools)
│  ├─ requirements.txt
│  ├─ best.pt / best_1.pt             # (Trained segmentation models, optional)
│  └─ trash-detection/
│     ├─ trash_analyzer.py            # Core analyzer (segment → crop → Gemini → send)
│     ├─ segment.py                   # Stub segmentation (works out-of-the-box)
│     ├─ yolo_segment.py              # YOLOv8 segmentation (requires ultralytics)
│     ├─ send_to_dashboard.py         # Helper to copy crop + POST to dashboard
│     ├─ test_detection.py            # One-click demo sender
│     ├─ clear_detections.py          # Clears dashboard store
│     ├─ config.env                    # Local env file (do NOT commit secrets)
│     └─ .trash_crops/                # Saved crops when --debug enabled
│
├─ frontend/
│  ├─ app/ components/ public/        # Next.js app & UI
│  ├─ public/detections/              # Crops copied here for serving
│  ├─ package.json  next.config.mjs
│  └─ /api/detections (in-memory API) # GET/POST/DELETE
│
└─ Visual/                            # Additional visualizations / docs
```


## Backend — Analyzer details

### Segmentation options
- Default stub (`segment.py`): simple luma threshold returning at most one mask. Zero setup.
- YOLOv8 (`yolo_segment.py`): real segmentation if you have an Ultralytics model.
  - Install Ultralytics and torch:
    ```bash
    pip install ultralytics torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu
    ```
  - Ensure your model exists at `backend/best.pt` (default in `yolo_segment.py`) or pass a path when wiring it in.
  - Swap the import in `trash_analyzer.py` if you want YOLO by default (two options):
    - Replace the import block with `from yolo_segment import segment`
    - Or create `segmenter.py` that re-exports `segment` from your preferred backend.

### “New object” logic
- Computes centroid per mask and compares with previously seen centroids (Euclidean distance).
- If distance > threshold (default 40px), the object is considered “new” and processed.
- Seen centroids are persisted to `.trash_analyzer_seen.json` (path configurable).

### Gemini classification
- `trash_analyzer.py` builds a strict prompt requesting JSON with:
  - `label`, `threat_level`, `decomposition_years`, `environmental_impact`,
    `disposal_instructions`, `probable_source`.
- If the response isn’t valid JSON, it gracefully falls back to a simple label.


## Frontend — Dashboard

- Polls `/api/detections` every 2s.
- Renders a compact card list with threat badge, confidence, location, size, and timestamp.
- Click an item for a detailed panel with four color‑coded sections:
  - Decomposition estimate (orange)
  - Environmental threat (red)
  - Recycling/disposal (green)
  - Probable source (blue)


## API (Next.js, in-memory for demo)

- GET `/api/detections` → `{ detections: [...], count: number }`
- POST `/api/detections` with JSON payload:
  ```json
  {
    "trashType": "Plastic bottle",
    "threatLevel": "High",
    "decompositionYears": 450,
    "environmentalImpact": "…",
    "disposalInstructions": "…",
    "probableSource": "…",
    "image": "/detections/detection_123.png",
    "confidence": 94,
    "location": "Zone A-3",
    "size": "Medium"
  }
  ```
- DELETE `/api/detections` → clears all detections.


## Setup (detailed)

### Prereqs
- Node.js 18+ (or 20+)
- Python 3.10+ (3.11/3.12 also OK)
- macOS/Linux/Windows supported

### Frontend
```bash
cd frontend
npm install
npm run dev
# opens http://localhost:3000
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Set env var (choose one):
```bash
export GEMINI_API_KEY="YOUR_KEY"          # macOS/Linux
# PowerShell: $env:GEMINI_API_KEY="YOUR_KEY"
```

Run the analyzer:
```bash
cd backend/trash-detection
python trash_analyzer.py ../bottlewater.jpeg --debug --crops-dir .trash_crops
```

Send a test detection (if you just want a quick UI card):
```bash
python test_detection.py
```

Clear detections:
```bash
python clear_detections.py
```


## Evaluation script (for judges)

1) Start dashboard → `npm run dev` (frontend). Confirm empty state appears.
2) In another terminal, set `GEMINI_API_KEY` and run analyzer on sample image.
3) Watch terminal logs: “Saved crop…”, “NEW object…”, “Received response from Gemini…”
4) Switch to browser: a new detection card appears automatically within 2 seconds.
5) Click card: show threat level, decomposition years, disposal guidance, probable source.
6) Optional: `python clear_detections.py` → watch UI return to empty state.

If no card appears, use `python test_detection.py` to inject a mock detection and continue narrative.


## Troubleshooting

- “Could not connect to dashboard”
  - Ensure `npm run dev` is running in `frontend` (http://localhost:3000).
- “GEMINI_API_KEY not set”
  - Export the variable or pass `--api-key` / `--api-key-file` to `trash_analyzer.py`.
- YOLO not installed / model missing
  - Use stub `segment.py` (default) or install Ultralytics and place your `.pt` at `backend/best.pt`.
- Nothing detected
  - The stub segmentation may filter your image; try another image, or switch to YOLO.
  - Delete `backend/trash-detection/.trash_analyzer_seen.json` to reset the “seen objects” cache.


## Security & Privacy
- Do not commit API keys. Use environment variables or secret managers.
- Images used for demo should be publicly shareable.


## Roadmap (post-hackathon)
- Real-time ingest from RTSP/USV drones/satellite frames.
- WebSocket/SSE live updates (instead of polling).
- Persistent store (Postgres/SQLite) + analytics.
- Geospatial heatmaps and time-lapse exploration.
- On-device segmentation for low-connectivity deployments.


## License
Hackathon prototype — choose a license before open-sourcing beyond demo use.


