# Trash Detection System

All Python-based trash detection and analysis tools.

## Files in This Folder

### Main Scripts
- `trash_analyzer.py` - Main analyzer: detects trash, crops, and gets Gemini analysis
- `segment.py` - Segmentation function (stub, replace with your model)
- `send_to_dashboard.py` - Helper to send detections to Next.js dashboard
- `test_detection.py` - Test the full detection system
- `clear_detections.py` - Clear all detections from dashboard

### Configuration
- `config.env` - Environment variables (API key)

### Data/Output
- `.trash_crops/` - Cropped detection images
- `.trash_analyzer_seen.json` - Tracks seen object centroids

### Documentation
- `TRASH_ANALYZER_GUIDE.md` - Complete Python analyzer guide
- `DYNAMIC_DETECTION_GUIDE.md` - Dashboard integration guide

## Quick Start

### 1. Activate Environment
```cmd
cd C:\Users\user\Documents\OceanHub\trash-detection
call ..\.venv\Scripts\activate.bat
```

### 2. Set API Key
```cmd
set "GEMINI_API_KEY=AIzaSyAQVWip_MOsomzbHgdJDmYHvqO2uZ_suIw"
```

### 3. Run Analyzer
```cmd
python trash_analyzer.py path\to\image.jpg --debug --crops-dir .trash_crops
```

### 4. Test Detection System
```cmd
python test_detection.py
```

### 5. Clear Detections
```cmd
python clear_detections.py
```

## Integration with Dashboard

From project root, start dashboard:
```cmd
npm run dev
```

Then run scripts from this folder:
```cmd
cd trash-detection
call ..\.venv\Scripts\activate.bat
python test_detection.py
```

Dashboard will auto-update with new detections!

## File Paths

When running scripts from `trash-detection/` folder:
- Python scripts: `python trash_analyzer.py IMAGE.jpg`
- Dashboard public folder: `../public/detections/`
- Virtual environment: `../.venv/Scripts/activate.bat`

All scripts automatically handle relative paths.

