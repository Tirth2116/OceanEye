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
import time
import shutil
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import subprocess
import threading
import uuid
import json

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

import requests
import re

try:
    import google.generativeai as genai  # type: ignore
except Exception:
    genai = None


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
PYTHON_BIN = os.environ.get("PYTHON_BIN", "python3")
YOLO_SCRIPT = THIS_DIR / "yolov8_seg_track.py"
MODEL_PATH = THIS_DIR / "best.pt"

JOBS: Dict[str, Dict[str, Any]] = {}
FIXED_OUTPUT_NAME = "output.mp4"

# -----------------------------
# Utilities
# -----------------------------
def copy_image_to_public(src_path: Path) -> str:
    """
    Copy image file to frontend/public/detections and return the public URL path.
    """
    DETECTIONS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = int(time.time() * 1000)
    ext = src_path.suffix or ".png"
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


# -----------------------------
# Flask app
# -----------------------------
app = Flask(__name__)
CORS(app, resources={r"*": {"origins": "*"}})


@app.get("/health")
def health():
    return jsonify({"ok": True})


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

    # Classify via Gemini (or fallback)
    gemini_data = classify_image_with_gemini(tmp_path)

    # Copy to public and get public URL
    public_url = copy_image_to_public(tmp_path)

    # Forward as detection to Next.js
    ok, err = send_detection_to_dashboard(
        image_url=public_url,
        gemini_data=gemini_data,
        confidence=95,
        location="Uploaded Image",
        size="Medium",
    )

    # Clean temp
    try:
        tmp_path.unlink(missing_ok=True)
    except Exception:
        pass

    res: Dict[str, Any] = {"image_url": public_url, "analysis": gemini_data, "forwarded_to_dashboard": ok}
    if not ok and err:
        res["dashboard_error"] = err
        return jsonify(res), 202  # accepted but dashboard forward failed
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


