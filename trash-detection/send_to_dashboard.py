#!/usr/bin/env python3
"""
Helper script to send trash detections to the Next.js dashboard.

Usage:
    python send_to_dashboard.py CROP_IMAGE_PATH GEMINI_JSON_RESPONSE [OPTIONS]

Example:
    python send_to_dashboard.py .trash_crops/crop_0_137_90.png '{"label":"Plastic bottle",...}'
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional
import shutil

try:
    import requests
except ImportError:
    print("Error: 'requests' library not installed. Run: pip install requests")
    sys.exit(1)


def copy_image_to_public(crop_path: Path, public_dir: Path = Path("../public/detections")) -> str:
    """Copy the crop image to Next.js public directory and return the public URL path."""
    public_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename based on timestamp
    import time
    timestamp = int(time.time() * 1000)
    ext = crop_path.suffix
    public_filename = f"detection_{timestamp}{ext}"
    public_path = public_dir / public_filename
    
    # Copy file
    shutil.copy2(crop_path, public_path)
    
    # Return URL path (relative to public/)
    return f"/detections/{public_filename}"


def send_detection_to_dashboard(
    image_url: str,
    gemini_data: dict,
    confidence: int = 95,
    location: str = "Unknown",
    size: str = "Medium",
    dashboard_url: str = "http://localhost:3000",
) -> bool:
    """
    Send a trash detection to the Next.js dashboard API.
    
    Args:
        image_url: Public URL path to the detection image (e.g., "/detections/detection_123.png")
        gemini_data: Parsed JSON from Gemini containing label, threat_level, etc.
        confidence: Detection confidence percentage (0-100)
        location: Detection location/zone
        size: Object size (Small/Medium/Large)
        dashboard_url: Base URL of your Next.js dashboard
    
    Returns:
        True if successful, False otherwise
    """
    api_url = f"{dashboard_url}/api/detections"
    
    # Build payload from Gemini data
    payload = {
        "trashType": gemini_data.get("label", "Unknown"),
        "threatLevel": gemini_data.get("threat_level", "Medium"),
        "decompositionYears": gemini_data.get("decomposition_years", 100),
        "environmentalImpact": gemini_data.get("environmental_impact", "Environmental impact data unavailable."),
        "disposalInstructions": gemini_data.get("disposal_instructions", "Disposal instructions unavailable."),
        "probableSource": gemini_data.get("probable_source", "Source unknown."),
        "image": image_url,
        "confidence": confidence,
        "location": location,
        "size": size,
    }
    
    try:
        response = requests.post(api_url, json=payload, timeout=5)
        response.raise_for_status()
        print(f"✓ Detection sent successfully: {payload['trashType']}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed to send detection: {e}")
        return False


def parse_args():
    parser = argparse.ArgumentParser(
        description="Send trash detection to Next.js dashboard"
    )
    parser.add_argument(
        "crop_image",
        type=str,
        help="Path to cropped image (e.g., .trash_crops/crop_0_137_90.png)",
    )
    parser.add_argument(
        "gemini_json",
        type=str,
        help='Gemini JSON response (e.g., \'{"label":"Plastic bottle",...}\')',
    )
    parser.add_argument(
        "--confidence",
        type=int,
        default=95,
        help="Detection confidence (0-100). Default: 95",
    )
    parser.add_argument(
        "--location",
        type=str,
        default="Zone A-1",
        help="Detection location/zone. Default: Zone A-1",
    )
    parser.add_argument(
        "--size",
        type=str,
        choices=["Small", "Medium", "Large"],
        default="Medium",
        help="Object size. Default: Medium",
    )
    parser.add_argument(
        "--dashboard-url",
        type=str,
        default="http://localhost:3000",
        help="Dashboard URL. Default: http://localhost:3000",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    
    # Validate crop image exists
    crop_path = Path(args.crop_image)
    if not crop_path.exists():
        print(f"Error: Crop image not found: {crop_path}")
        sys.exit(1)
    
    # Parse Gemini JSON
    try:
        gemini_data = json.loads(args.gemini_json)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}")
        sys.exit(1)
    
    # Copy image to public directory
    print(f"Copying {crop_path} to public directory...")
    image_url = copy_image_to_public(crop_path)
    print(f"Image available at: {image_url}")
    
    # Send to dashboard
    success = send_detection_to_dashboard(
        image_url=image_url,
        gemini_data=gemini_data,
        confidence=args.confidence,
        location=args.location,
        size=args.size,
        dashboard_url=args.dashboard_url,
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

