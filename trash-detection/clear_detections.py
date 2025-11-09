#!/usr/bin/env python3
"""
Clear all detections from the dashboard.

Usage:
    python clear_detections.py
"""

try:
    import requests
except ImportError:
    print("Installing requests...")
    import subprocess
    subprocess.run(["pip", "install", "requests"], check=True)
    import requests


def clear_detections(dashboard_url="http://localhost:3000"):
    """Clear all detections from the dashboard"""
    api_url = f"{dashboard_url}/api/detections"
    
    try:
        response = requests.delete(api_url, timeout=5)
        response.raise_for_status()
        print("✓ All detections cleared successfully!")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to dashboard")
        print("   Make sure Next.js is running: npm run dev")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to clear: {e}")
        return False


if __name__ == "__main__":
    print("Clearing all detections...")
    clear_detections()

