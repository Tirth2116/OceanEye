#!/usr/bin/env python3
"""
Quick script to check if you're getting REAL or MOCK satellite data
"""

import sys
try:
    import ee
    print("✓ earthengine-api is installed")
    
    # Try to initialize
    try:
        ee.Initialize(project='nidaan-ai')
        print("✓ Earth Engine initialized successfully!")
        print("✓ You are configured for REAL satellite data!")
        print("\n🛰️ Data source: Copernicus Sentinel-2 satellites")
        print("📡 Resolution: 10 meters")
        print("🌍 Coverage: Global")
        print("\nYour backend will use REAL satellite imagery! 🎉")
        sys.exit(0)
    except Exception as e:
        print("✗ Earth Engine initialization failed")
        print(f"  Error: {e}")
        print("\n⚠️ Your backend will use MOCK data")
        print("\nTo fix:")
        print("1. Run: earthengine authenticate")
        print("2. Restart your backend")
        sys.exit(1)
        
except ImportError:
    print("✗ earthengine-api not installed")
    print("\n⚠️ Your backend will use MOCK data")
    print("\nTo fix:")
    print("1. Run: pip install earthengine-api")
    print("2. Run: earthengine authenticate")
    print("3. Restart your backend")
    sys.exit(1)

