# Trash Detection Quick Reference

All Python trash detection files are now organized in the `trash-detection/` folder.

## Folder Structure

```
OceanHub/
├── trash-detection/              ← All Python detection files here
│   ├── trash_analyzer.py         ← Main analyzer
│   ├── segment.py                ← Segmentation (replace with your model)
│   ├── send_to_dashboard.py      ← Send to dashboard helper
│   ├── test_detection.py         ← Test the system
│   ├── clear_detections.py       ← Clear all detections
│   ├── config.env                ← API key
│   ├── .trash_crops/             ← Generated crops
│   ├── .trash_analyzer_seen.json ← Seen objects tracker
│   └── README.md                 ← Full documentation
├── components/                   ← React UI components
├── app/                          ← Next.js app
│   └── api/detections/           ← Detection API endpoints
└── public/detections/            ← Detection images for dashboard
```

## Quick Commands

### Run Analyzer (from trash-detection folder)
```cmd
cd trash-detection
call ..\.venv\Scripts\activate.bat
set "GEMINI_API_KEY=AIzaSyAQVWip_MOsomzbHgdJDmYHvqO2uZ_suIw"
python trash_analyzer.py path\to\image.jpg --debug --crops-dir .trash_crops
```

### Test Full System
```cmd
cd trash-detection
call ..\.venv\Scripts\activate.bat
python test_detection.py
```

### Send Detection to Dashboard
```cmd
cd trash-detection
python send_to_dashboard.py .trash_crops\crop_0_137_90.png "JSON_FROM_GEMINI"
```

### Clear All Detections
```cmd
cd trash-detection
python clear_detections.py
```

## Run from Project Root (Alternative)

```cmd
REM Analyzer
python trash-detection\trash_analyzer.py image.jpg --debug --crops-dir trash-detection\.trash_crops

REM Test
python trash-detection\test_detection.py

REM Clear
python trash-detection\clear_detections.py
```

## Dashboard Integration

1. **Start Dashboard** (from project root):
   ```cmd
   npm run dev
   ```

2. **Run Detection** (from trash-detection folder):
   ```cmd
   cd trash-detection
   call ..\.venv\Scripts\activate.bat
   python test_detection.py
   ```

3. **View Results**: http://localhost:3000

## Key Points

- ✅ All Python files are in `trash-detection/`
- ✅ Dashboard files stay in project root
- ✅ Scripts automatically handle relative paths
- ✅ API key is in `trash-detection/config.env`
- ✅ Crops saved to `trash-detection/.trash_crops/`
- ✅ Dashboard reads from `public/detections/`

## Full Documentation

See `trash-detection/README.md` for complete documentation.

