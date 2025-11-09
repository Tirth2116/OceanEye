#!/usr/bin/env python3
"""
Unified Flask backend for OceanHub

Features:
- POST /upload-video: accept an MP4, save to uploads, run YOLOv8 segmentation via yolov8_seg_track.py
- POST /upload-image: accept an image, optionally classify with Gemini, copy to frontend/public/detections,
  and forward a detection to the Next.js dashboard API
- GET  /health: health check
- POST /clear-detections: clear detections on the Next.js dashboard

Run:
  python main.py --host 0.0.0.0 --port 5001
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import shutil
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import subprocess
import threading
import uuid
import json
import importlib.util

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

import requests
import re
from PIL import Image

# Import satellite monitor
SATELLITE_AVAILABLE = False
try:
    from satellite_monitor import get_monitor
    SATELLITE_AVAILABLE = True
    print("✓ Satellite monitor loaded successfully")
except ImportError as e:
    print(f"⚠ Satellite monitor not available (using mock data): {e}")
except Exception as e:
    print(f"⚠ Error loading satellite monitor: {e}")

try:
    import google.generativeai as genai  # type: ignore
except Exception:
    genai = None

try:
    import numpy as np
    from PIL import Image
except ImportError:
    np = None  # type: ignore
    Image = None  # type: ignore


# -----------------------------
# Path helpers
# -----------------------------
THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parents[1]  # /Users/.../OceanHub
FRONTEND_PUBLIC = REPO_ROOT / "frontend" / "public"
DETECTIONS_DIR = FRONTEND_PUBLIC / "detections"
UPLOADS_DIR = THIS_DIR / "uploads"
OUTPUTS_DIR = THIS_DIR / "outputs"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
DETECTIONS_DIR.mkdir(parents=True, exist_ok=True)

NEXT_DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "http://localhost:3000")
# Use current Python interpreter (works cross-platform)
PYTHON_BIN = os.environ.get("PYTHON_BIN", sys.executable or "python")
YOLO_SCRIPT = THIS_DIR / "yolov8_seg_track.py"
TRASH_DET_DIR = THIS_DIR / "trash-detection"
TRASH_ANALYZER_PATH = TRASH_DET_DIR / "trash_analyzer.py"
SEND_TO_DASHBOARD_PATH = TRASH_DET_DIR / "send_to_dashboard.py"
MODEL_PATH = THIS_DIR / "best.pt"

JOBS: Dict[str, Dict[str, Any]] = {}
FIXED_OUTPUT_NAME = "output.mp4"

# -----------------------------
# Utilities
# -----------------------------
def _sanitize_ext(ext: str) -> str:
    ext = (ext or "").lower()
    if ext in {".png", ".jpg", ".jpeg", ".webp"}:
        return ext
    # If it looks like ".png1", strip trailing digits and re-check
    import re as _re
    m = _re.match(r"\.(png|jpe?g|webp)\d+$", ext, flags=_re.IGNORECASE)
    if m:
        base = "." + m.group(1).lower()
        return base if base in {".png", ".jpg", ".jpeg", ".webp"} else ".png"
    return ".png"

def _normalize_public_image_url(url_path: str) -> str:
    s = (url_path or "").strip()
    if not s.startswith("/"):
        s = "/" + s
    try:
        import re as _re
        s = _re.sub(r"\.(png|jpe?g|webp)\d+$", lambda m: "." + m.group(1), s, flags=_re.IGNORECASE)
    except Exception:
        pass
    return s

def copy_image_to_public(src_path: Path) -> str:
    """
    Copy image file to frontend/public/detections and return the public URL path.
    """
    DETECTIONS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = int(time.time() * 1000)
    ext = _sanitize_ext(src_path.suffix or ".png")
    dest_name = f"detection_{timestamp}{ext}"
    dest_path = DETECTIONS_DIR / dest_name
    shutil.copy2(src_path, dest_path)
    return f"/detections/{dest_name}"


def send_detection_to_dashboard(
    image_url: str,
    gemini_data: Dict[str, Any],
    confidence: int = 95,
    location: str = "Unknown",
    size: str = "Medium",
    dashboard_url: str = NEXT_DASHBOARD_URL,
) -> Tuple[bool, Optional[str]]:
    payload = {
        "trashType": gemini_data.get("label", "Unknown"),
        "threatLevel": gemini_data.get("threat_level", "Medium"),
        "decompositionYears": gemini_data.get("decomposition_years", 100),
        "environmentalImpact": gemini_data.get(
            "environmental_impact", "Environmental impact data unavailable."
        ),
        "disposalInstructions": gemini_data.get(
            "disposal_instructions", "Disposal instructions unavailable."
        ),
        "probableSource": gemini_data.get("probable_source", "Source unknown."),
        "image": image_url,
        "confidence": confidence,
        "location": location,
        "size": size,
    }
    try:
        api_url = f"{dashboard_url}/api/detections"
        r = requests.post(api_url, json=payload, timeout=10)
        r.raise_for_status()
        return True, None
    except Exception as e:
        return False, str(e)


def classify_image_with_gemini(image_path: Path) -> Dict[str, Any]:
    """
    Call Gemini to classify an image. If not configured, return a sensible fallback.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or genai is None:
        return {
            "label": "Unknown",
            "threat_level": "Medium",
            "decomposition_years": 100,
            "environmental_impact": "AI not configured; returning default analysis.",
            "disposal_instructions": "Refer to local recycling guidance.",
            "probable_source": "Unknown",
        }
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        prompt = (
            "Analyze this trash item and respond with a JSON object containing:\n"
            "{\n"
            '  "label": "short name (e.g., plastic bottle, fishing net)",\n'
            '  "threat_level": "Low|Medium|High|Critical",\n'
            '  "decomposition_years": number,\n'
            '  "environmental_impact": "description",\n'
            '  "disposal_instructions": "guidance",\n'
            '  "probable_source": "likely origin"\n'
            "}\n"
            "Respond ONLY with valid JSON."
        )
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        response = model.generate_content([prompt, {"mime_type": "image/png", "data": image_bytes}])
        raw = (response.text or "").strip()
        try:
            import json as _json
            cleaned = raw.replace("```json", "").replace("```", "").strip()
            data = _json.loads(cleaned)
        except Exception:
            # Fallback: label only
            data = {
                "label": raw[:64] if raw else "Unknown",
                "threat_level": "Medium",
                "decomposition_years": 100,
                "environmental_impact": "Model returned non-JSON; using fallback fields.",
                "disposal_instructions": "Refer to local recycling guidance.",
                "probable_source": "Unknown",
            }
        return data
    except Exception:
        return {
            "label": "Unknown",
            "threat_level": "Medium",
            "decomposition_years": 100,
            "environmental_impact": "Gemini call failed; using fallback.",
            "disposal_instructions": "Refer to local recycling guidance.",
            "probable_source": "Unknown",
        }

# Prefer premade analyzer helpers if available
def _load_module_from_path(mod_name: str, file_path: Path):
    try:
        spec = importlib.util.spec_from_file_location(mod_name, str(file_path))
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)  # type: ignore[attr-defined]
            return module
    except Exception:
        return None
    return None

def classify_image_with_premade(image_path: Path) -> Dict[str, Any]:
    """
    Use backend/trash-detection/trash_analyzer.py's classify_with_gemini on the full frame.
    Falls back to local classify_image_with_gemini if import fails.
    """
    trash_analyzer = _load_module_from_path("trash_analyzer_mod", TRASH_ANALYZER_PATH)
    if trash_analyzer and hasattr(trash_analyzer, "classify_with_gemini"):
        try:
            img = Image.open(image_path).convert("RGB")
            label, raw_text, _prompt = trash_analyzer.classify_with_gemini(img)  # type: ignore[attr-defined]
            data: Dict[str, Any] = {}
            if raw_text:
                try:
                    clean = raw_text.replace("```json", "").replace("```", "").strip()
                    data = json.loads(clean)
                except Exception:
                    data = {}
            if not data:
                data = {
                    "label": (label or "Unknown"),
                    "threat_level": "Medium",
                    "decomposition_years": 100,
                    "environmental_impact": "No structured analysis available.",
                    "disposal_instructions": "Refer to local recycling guidance.",
                    "probable_source": "Unknown",
                }
            return {
                "label": data.get("label", label or "Unknown"),
                "threat_level": data.get("threat_level", "Medium"),
                "decomposition_years": data.get("decomposition_years", 100),
                "environmental_impact": data.get("environmental_impact", "Environmental impact data unavailable."),
                "disposal_instructions": data.get("disposal_instructions", "Disposal instructions unavailable."),
                "probable_source": data.get("probable_source", "Unknown"),
            }
        except Exception:
            pass
    return classify_image_with_gemini(image_path)


def segment_and_classify_frame(image_path: Path) -> list[Dict[str, Any]]:
    """
    Run full pipeline: YOLO segmentation -> crop each object -> classify with Gemini.
    Returns a list of detections (one per detected object).
    """
    detections = []
    
    try:
        # Load YOLO segmentation module
        yolo_seg_path = TRASH_DET_DIR / "yolo_segment.py"
        yolo_seg = _load_module_from_path("yolo_segment_mod", yolo_seg_path)
        if not yolo_seg or not hasattr(yolo_seg, "segment"):
            print(f"[segment_and_classify] YOLO segment module not found, using fallback", flush=True)
            # Fallback to single full-frame classification
            return [classify_image_with_premade(image_path)]
        
        # Load trash analyzer for crop + classify
        trash_analyzer = _load_module_from_path("trash_analyzer_mod", TRASH_ANALYZER_PATH)
        if not trash_analyzer:
            print(f"[segment_and_classify] trash_analyzer not found, using fallback", flush=True)
            return [classify_image_with_premade(image_path)]
        
        # Load image
        img = Image.open(image_path).convert("RGB")
        img_np = np.array(img)
        
        # Run YOLO segmentation
        print(f"[segment_and_classify] Running YOLO segmentation on {image_path}", flush=True)
        masks = yolo_seg.segment(img, model_path=str(MODEL_PATH))  # type: ignore[attr-defined]
        
        if not masks:
            print(f"[segment_and_classify] No objects detected, using full-frame classification", flush=True)
            return [classify_image_with_premade(image_path)]
        
        print(f"[segment_and_classify] Found {len(masks)} objects", flush=True)
        
        # Save crops directory
        crops_dir = TRASH_DET_DIR / ".trash_crops"
        crops_dir.mkdir(parents=True, exist_ok=True)
        
        # Process each mask
        for i, mask in enumerate(masks):
            try:
                # Crop the object region
                crop = trash_analyzer.crop_mask_region(img, mask, pad=6)  # type: ignore[attr-defined]
                if crop is None:
                    continue
                
                # Save crop for debugging
                timestamp = int(time.time() * 1000)
                crop_filename = f"crop_{timestamp}_{i}.png"
                crop_path = crops_dir / crop_filename
                crop.save(str(crop_path))
                print(f"[segment_and_classify] Saved crop {i}: {crop_path}", flush=True)
                
                # Classify with Gemini (with verbose logging)
                print(f"\n{'='*80}", flush=True)
                print(f"🔍 SENDING TO GEMINI - Object {i+1}/{len(masks)}", flush=True)
                print(f"{'='*80}", flush=True)
                print(f"📸 Image size: {crop.size[0]}x{crop.size[1]} pixels", flush=True)
                print(f"📦 Image format: PNG", flush=True)
                print(f"💾 Saved to: {crop_path}", flush=True)
                print(f"\n⏳ Waiting for Gemini response...\n", flush=True)
                
                label, raw_text, _prompt = trash_analyzer.classify_with_gemini(crop, debug=True)  # type: ignore[attr-defined]
                
                print(f"\n{'='*80}", flush=True)
                print(f"📨 GEMINI RESPONSE - Object {i+1}", flush=True)
                print(f"{'='*80}", flush=True)
                if raw_text:
                    print(f"Raw response ({len(raw_text)} chars):", flush=True)
                    print(f"{raw_text}", flush=True)
                else:
                    print(f"❌ No response received from Gemini", flush=True)
                print(f"{'='*80}\n", flush=True)
                
                # Parse Gemini response
                data: Dict[str, Any] = {}
                if raw_text:
                    try:
                        clean = raw_text.replace("```json", "").replace("```", "").strip()
                        data = json.loads(clean)
                        print(f"✅ Successfully parsed JSON response", flush=True)
                        print(f"   Label: {data.get('label', 'N/A')}", flush=True)
                        print(f"   Threat Level: {data.get('threat_level', 'N/A')}", flush=True)
                        print(f"   Decomposition: {data.get('decomposition_years', 'N/A')} years", flush=True)
                    except Exception as e:
                        print(f"⚠️  Failed to parse JSON: {e}", flush=True)
                        print(f"   Using raw text as label", flush=True)
                        data = {}
                
                if not data:
                    data = {
                        "label": (label or f"Trash Object {i+1}"),
                        "threat_level": "Medium",
                        "decomposition_years": 100,
                        "environmental_impact": "No structured analysis available.",
                        "disposal_instructions": "Refer to local recycling guidance.",
                        "probable_source": "Unknown",
                    }
                
                detection = {
                    "label": data.get("label", label or f"Trash Object {i+1}"),
                    "threat_level": data.get("threat_level", "Medium"),
                    "decomposition_years": data.get("decomposition_years", 100),
                    "environmental_impact": data.get("environmental_impact", "Environmental impact data unavailable."),
                    "disposal_instructions": data.get("disposal_instructions", "Disposal instructions unavailable."),
                    "probable_source": data.get("probable_source", "Unknown"),
                    "crop_path": crop_path,  # Keep track of crop path for later copying
                }
                detections.append(detection)
                print(f"[segment_and_classify] Object {i}: {detection['label']}", flush=True)
                
            except Exception as e:
                print(f"[segment_and_classify] Error processing mask {i}: {e}", flush=True)
                continue
        
        if not detections:
            print(f"[segment_and_classify] No valid crops, using full-frame classification", flush=True)
            return [classify_image_with_premade(image_path)]
        
        return detections
        
    except Exception as e:
        print(f"[segment_and_classify] Pipeline failed: {e}", flush=True)
        import traceback
        traceback.print_exc()
        # Fallback to single full-frame classification
        return [classify_image_with_premade(image_path)]
# -----------------------------
# Flask app
# -----------------------------
app = Flask(__name__)
CORS(app, resources={r"*": {"origins": "*"}})


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.route("/api/satellite/time-series", methods=["GET"])
def get_satellite_time_series():
    """Get satellite monitoring time series data"""
    try:
        from datetime import datetime, timedelta
        import random
        
        # Get parameters from query
        start_date = request.args.get('start_date', 
                                      (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d'))
        end_date = request.args.get('end_date', 
                                    datetime.now().strftime('%Y-%m-%d'))
        
        if SATELLITE_AVAILABLE:
            # Use real satellite monitor
            aoi_coords = [72.775, 18.875, 72.985, 19.255]
            monitor = get_monitor()
            data = monitor.get_time_series_data(aoi_coords, start_date, end_date)
            fdi_values = [d['fdi'] for d in data if d.get('fdi') is not None]
            analysis = monitor.analyze_pollution_level(fdi_values)
        else:
            # Generate mock data directly
            start = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            
            data = []
            current = start
            base_pollution = 0.35
            
            while current <= end:
                data.append({
                    'date': current.strftime('%Y-%m-%d'),
                    'ndci': round(0.2 + random.uniform(-0.05, 0.05), 3),
                    'ndwi': round(0.4 + random.uniform(-0.1, 0.1), 3),
                    'ndvi': round(0.15 + random.uniform(-0.05, 0.05), 3),
                    'fdi': round(base_pollution + random.uniform(-0.1, 0.1), 3)
                })
                current += timedelta(days=7)
            
            # Calculate analysis
            fdi_values = [d['fdi'] for d in data]
            avg_fdi = sum(fdi_values) / len(fdi_values)
            recent_avg = sum(fdi_values[-3:]) / min(3, len(fdi_values))
            older_avg = sum(fdi_values[:3]) / min(3, len(fdi_values))
            
            if avg_fdi < 0.2:
                status = 'excellent'
                level = 1
            elif avg_fdi < 0.4:
                status = 'good'
                level = 2
            elif avg_fdi < 0.6:
                status = 'moderate'
                level = 3
            elif avg_fdi < 0.8:
                status = 'poor'
                level = 4
            else:
                status = 'critical'
                level = 5
            
            if recent_avg > older_avg + 0.05:
                trend = 'worsening'
            elif recent_avg < older_avg - 0.05:
                trend = 'improving'
            else:
                trend = 'stable'
            
            analysis = {
                'status': status,
                'level': level,
                'trend': trend,
                'avgFdi': round(avg_fdi, 3),
                'recentAvg': round(recent_avg, 3)
            }
        
        return jsonify({
            "success": True,
            "data": data,
            "analysis": analysis,
            "aoi": {
                "name": "Mumbai Coast",
                "center": [19.0760, 72.8877]
            },
            "usingMockData": not SATELLITE_AVAILABLE
        }), 200
        
    except Exception as e:
        print(f"Error in satellite time series: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/satellite/summary", methods=["GET"])
def get_satellite_summary():
    """Get summary of satellite monitoring data"""
    try:
        from datetime import datetime, timedelta
        import random
        
        # Get last 30 days of data
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        if SATELLITE_AVAILABLE:
            aoi_coords = [72.775, 18.875, 72.985, 19.255]
            monitor = get_monitor()
            data = monitor.get_time_series_data(aoi_coords, start_date, end_date)
            fdi_values = [d['fdi'] for d in data if d.get('fdi') is not None]
            analysis = monitor.analyze_pollution_level(fdi_values)
        else:
            # Mock data
            data = [{
                'date': datetime.now().strftime('%Y-%m-%d'),
                'ndci': 0.22,
                'ndwi': 0.41,
                'ndvi': 0.16,
                'fdi': 0.34
            }]
            analysis = {
                'status': 'moderate',
                'level': 3,
                'trend': 'stable',
                'avgFdi': 0.34,
                'recentAvg': 0.34
            }
        
        if not data:
            return jsonify({"error": "No data available"}), 404
        
        latest = data[-1]
        
        return jsonify({
            "success": True,
            "latest": latest,
            "analysis": analysis,
            "dataPoints": len(data),
            "usingMockData": not SATELLITE_AVAILABLE
        }), 200
        
    except Exception as e:
        print(f"Error in satellite summary: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.post("/upload-video")
def upload_video():
    """
    Accept an MP4 upload and start YOLO processing in the background.
    """
    if "file" not in request.files:
        return jsonify({"error": "Missing form field 'file'"}), 400
    file = request.files["file"]
    if not file:
        return jsonify({"error": "Empty file"}), 400

    filename = secure_filename(file.filename or f"upload_{int(time.time()*1000)}.mp4")
    if not filename.lower().endswith(".mp4"):
        return jsonify({"error": "Only MP4 videos are supported"}), 400

    input_path = UPLOADS_DIR / filename
    file.save(str(input_path))

    # Fixed output path (overwrite each time)
    output_path = OUTPUTS_DIR / FIXED_OUTPUT_NAME
    try:
        if output_path.exists():
            output_path.unlink()
    except Exception:
        # ignore inability to delete; writer will overwrite
        pass

    # Create job record
    job_id = uuid.uuid4().hex
    log_path = OUTPUTS_DIR / f"job_{job_id}.log"
    JOBS[job_id] = {
        "id": job_id,
        "status": "starting",
        "pid": None,
        "input": str(input_path),
        "output": str(output_path),
        "log": str(log_path),
        "returncode": None,
        "created_at": int(time.time() * 1000),
        "ended_at": None,
    }
    print(f"[JOB {job_id}] Starting process for {input_path}", flush=True)

    # Spawn background process with logs captured
    args = [
        str(YOLO_SCRIPT),
        "--video",
        str(input_path),
        "--output",
        str(output_path),
        "--no-display",
        "--model",
        str(MODEL_PATH),
    ]
    try:
        log_f = open(log_path, "w")
        proc = subprocess.Popen([PYTHON_BIN, *args], stdout=log_f, stderr=subprocess.STDOUT)
        JOBS[job_id]["pid"] = proc.pid
        JOBS[job_id]["status"] = "running"
    except Exception as e:
        JOBS[job_id]["status"] = "error"
        JOBS[job_id]["error"] = f"Failed to start processing: {e}"
        print(f"[JOB {job_id}] Error starting: {e}", flush=True)
        return jsonify({"error": JOBS[job_id]["error"], "job_id": job_id}), 500

    # Watcher thread to update status when done
    def _watch():
        rc = proc.wait()
        JOBS[job_id]["returncode"] = rc
        JOBS[job_id]["ended_at"] = int(time.time() * 1000)
        if rc == 0 and Path(output_path).exists():
            JOBS[job_id]["status"] = "finished"
            print(f"[JOB {job_id}] Finished successfully -> {output_path}", flush=True)
        else:
            JOBS[job_id]["status"] = "error"
            print(f"[JOB {job_id}] Finished with error rc={rc}", flush=True)

    threading.Thread(target=_watch, daemon=True).start()

    return jsonify(
        {
            "started": True,
            "job_id": job_id,
            "pid": JOBS[job_id]["pid"],
            "input": str(input_path),
            "output": str(output_path),
            "log": str(log_path),
            "note": "Processing started. Poll /jobs/<job_id>/status for updates.",
        }
    )


@app.post("/upload-image")
def upload_image():
    """
    Accept an image, run Gemini classification (if enabled),
    copy into frontend/public/detections, and send a detection to the Next.js dashboard.
    """
    if "file" not in request.files:
        return jsonify({"error": "Missing form field 'file'"}), 400
    file = request.files["file"]
    if not file:
        return jsonify({"error": "Empty file"}), 400

    filename = secure_filename(file.filename or f"image_{int(time.time()*1000)}.png")
    suffix = Path(filename).suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        return jsonify({"error": "Unsupported image type"}), 400

    tmp_path = OUTPUTS_DIR / f"tmp_{int(time.time()*1000)}{suffix}"
    file.save(str(tmp_path))

    # Run full segmentation + crop + classify pipeline
    print(f"[upload-image] Starting segmentation pipeline for {tmp_path}", flush=True)
    detections = segment_and_classify_frame(tmp_path)
    print(f"[upload-image] Pipeline returned {len(detections)} detection(s)", flush=True)

    # Send each detection to dashboard
    send_helpers = _load_module_from_path("send_to_dashboard_mod", SEND_TO_DASHBOARD_PATH)
    sent_count = 0
    errors = []
    
    for idx, detection in enumerate(detections):
        try:
            # Copy crop to public (use crop_path if available, otherwise use original image)
            crop_source = detection.pop("crop_path", tmp_path)
            
            public_url = None
            if send_helpers and hasattr(send_helpers, "copy_image_to_public"):
                try:
                    public_url = send_helpers.copy_image_to_public(Path(crop_source))  # type: ignore[attr-defined]
                    print(f"[upload-image] Detection {idx}: Used premade helper, public_url={public_url}", flush=True)
                except Exception as e:
                    print(f"[upload-image] Detection {idx}: Premade helper failed: {e}", flush=True)
                    public_url = None
            
            if not public_url:
                public_url = copy_image_to_public(Path(crop_source))
                print(f"[upload-image] Detection {idx}: Used built-in copy, public_url={public_url}", flush=True)
            
            # Normalize extension if needed
            normalized_url = _normalize_public_image_url(public_url)
            if normalized_url != public_url:
                try:
                    old_name = public_url.rsplit("/", 1)[-1]
                    new_name = normalized_url.rsplit("/", 1)[-1]
                    old_path = DETECTIONS_DIR / old_name
                    new_path = DETECTIONS_DIR / new_name
                    if old_path.exists() and not new_path.exists():
                        old_path.rename(new_path)
                    public_url = normalized_url
                except Exception as e:
                    print(f"[upload-image] Detection {idx}: Normalization failed: {e}", flush=True)
            
            # Verify file exists
            final_filename = public_url.rsplit("/", 1)[-1]
            final_path = DETECTIONS_DIR / final_filename
            print(f"[upload-image] Detection {idx}: {final_path} exists={final_path.exists()}", flush=True)
            
            # Send to dashboard
            ok = False
            if send_helpers and hasattr(send_helpers, "send_detection_to_dashboard"):
                try:
                    ok = bool(
                        send_helpers.send_detection_to_dashboard(  # type: ignore[attr-defined]
                            image_url=public_url,
                            gemini_data=detection,
                            confidence=95,
                            location="Captured Frame",
                            size="Medium",
                            dashboard_url=NEXT_DASHBOARD_URL,
                        )
                    )
                except Exception as e:
                    print(f"[upload-image] Detection {idx}: Dashboard send failed: {e}", flush=True)
                    ok = False
            else:
                ok, err = send_detection_to_dashboard(
                    image_url=public_url,
                    gemini_data=detection,
                    confidence=95,
                    location="Captured Frame",
                    size="Medium",
                )
            
            if ok:
                sent_count += 1
                print(f"[upload-image] Detection {idx}: Successfully sent to dashboard", flush=True)
            else:
                errors.append(f"Detection {idx} failed to send")
                
        except Exception as e:
            print(f"[upload-image] Detection {idx}: Error: {e}", flush=True)
            errors.append(f"Detection {idx}: {str(e)}")
            continue

    # Clean temp
    try:
        tmp_path.unlink(missing_ok=True)
    except Exception:
        pass

    res: Dict[str, Any] = {
        "detections_found": len(detections),
        "detections_sent": sent_count,
        "success": sent_count > 0
    }
    if errors:
        res["errors"] = errors
    
    return jsonify(res)

@app.get("/jobs/<job_id>/status")
def job_status(job_id: str):
    """
    Get job status, including last log tail and whether output exists.
    """
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"error": "job not found"}), 404
    # Tail last ~50 lines
    tail_lines = []
    try:
        lp = Path(job["log"])
        if lp.exists():
            with lp.open("r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
                tail_lines = lines[-50:]
    except Exception:
        pass
    outp = Path(job["output"])
    exists = outp.exists()
    # Try to parse progress percent from log tail
    progress_percent: Optional[float] = None
    for line in reversed(tail_lines):
        m = re.search(r"Progress:\s+\d+/\d+\s+frames\s+\(([\d\.]+)%\)", line)
        if m:
            try:
                progress_percent = float(m.group(1))
                break
            except Exception:
                pass
        m2 = re.search(r"Progress:\s+(\d+)\s+frames processed", line)
        if m2:
            # No total available; give a coarse 0-100 estimate if runtime is long
            try:
                frames_done = float(m2.group(1))
                progress_percent = max(1.0, min(99.0, frames_done / 10.0))  # heuristic
                break
            except Exception:
                pass
    output_url = None
    if exists:
        # Cache-bust with mtime so the video element reloads
        try:
            mtime = int(outp.stat().st_mtime)
        except Exception:
            mtime = int(time.time())
        output_url = f"http://localhost:5001/outputs/{FIXED_OUTPUT_NAME}?v={mtime}"
    resp = {
        **job,
        "output_exists": exists,
        "output_url": output_url,
        "progress_percent": progress_percent,
        "log_tail": tail_lines,
    }
    return jsonify(resp)

@app.get("/jobs")
def list_jobs():
    return jsonify({"jobs": list(JOBS.values())})

@app.get("/outputs/<path:filename>")
def serve_output(filename: str):
    """
    Serve processed video files from the outputs directory.
    """
    options: Dict[str, Any] = {"as_attachment": False}
    if filename.lower().endswith(".mp4"):
        options["mimetype"] = "video/mp4"
    resp = send_from_directory(str(OUTPUTS_DIR), filename, **options)
    # Ensure fresh fetches and CORS visibility for media
    try:
        resp.headers["Cache-Control"] = "no-store, max-age=0"
        resp.headers["Access-Control-Expose-Headers"] = "Content-Type, Content-Length"
    except Exception:
        pass
    return resp


@app.post("/clear-detections")
def clear_detections():
    """
    Proxy to Next.js to clear detections.
    """
    try:
        r = requests.delete(f"{NEXT_DASHBOARD_URL}/api/detections", timeout=10)
        r.raise_for_status()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Unified Flask backend for OceanHub")
    p.add_argument("--host", type=str, default="0.0.0.0")
    p.add_argument("--port", type=int, default=5001)
    p.add_argument("--debug", action="store_true")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    app.run(host=args.host, port=args.port, debug=args.debug)


