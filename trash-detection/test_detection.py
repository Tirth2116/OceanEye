#!/usr/bin/env python3
"""
Quick test script to verify the dynamic detection system works.
This simulates what your video analyzer will do.
"""

import json
import shutil
from pathlib import Path

try:
    import requests
except ImportError:
    print("Installing requests...")
    import subprocess
    subprocess.run(["pip", "install", "requests"], check=True)
    import requests


def test_send_detection():
    """Test sending a detection to the dashboard"""
    
    # Check if we have a crop to test with
    crops_dir = Path(".trash_crops")
    if not crops_dir.exists() or not list(crops_dir.glob("*.png")):
        print("❌ No crops found in .trash_crops/")
        print("   Run: python trash_analyzer.py bottlewater.jpeg --debug --crops-dir .trash_crops")
        return False
    
    # Get the first crop
    crop_path = list(crops_dir.glob("*.png"))[0]
    print(f"Using crop: {crop_path}")
    
    # Copy to public directory (relative to project root)
    public_dir = Path("../public/detections")
    public_dir.mkdir(parents=True, exist_ok=True)
    
    import time
    timestamp = int(time.time() * 1000)
    public_filename = f"test_detection_{timestamp}.png"
    dest_path = public_dir / public_filename
    shutil.copy2(crop_path, dest_path)
    print(f"✓ Copied to: {dest_path}")
    
    # Create test payload (simulating Gemini response)
    payload = {
        "trashType": "Plastic Bottle (Test)",
        "threatLevel": "High",
        "decompositionYears": 450,
        "environmentalImpact": "This is a test detection. Plastic bottles pose significant threats to marine life through ingestion and entanglement. They break down into harmful microplastics over centuries.",
        "disposalInstructions": "Empty, rinse thoroughly, and place in recycling bin. Check for recycling symbol #1 (PET).",
        "probableSource": "Consumer waste from recreational activities or improper disposal.",
        "image": f"/detections/{public_filename}",
        "confidence": 94,
        "location": "Test Zone A-3",
        "size": "Medium"
    }
    
    # Send to dashboard API
    dashboard_url = "http://localhost:3000"
    api_url = f"{dashboard_url}/api/detections"
    
    print(f"\nSending to: {api_url}")
    try:
        response = requests.post(api_url, json=payload, timeout=5)
        response.raise_for_status()
        print("✓ Detection sent successfully!")
        print(f"\n📊 Dashboard: {dashboard_url}")
        print("   Check the 'New Trash Detected' panel")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to dashboard")
        print("   Make sure Next.js is running: npm run dev")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to send: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Testing Dynamic Detection System")
    print("=" * 60)
    print()
    
    success = test_send_detection()
    
    print()
    print("=" * 60)
    if success:
        print("✓ TEST PASSED")
        print("  Open http://localhost:3000 and check the dashboard")
    else:
        print("✗ TEST FAILED")
        print("  See error messages above")
    print("=" * 60)

