#!/usr/bin/env python3
"""
Test script for Satellite Analysis API
Run this to verify the satellite monitoring system is working
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:5001"

def print_section(title: str):
    """Print a section header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_get_cities():
    """Test getting available cities"""
    print_section("🌍 Test 1: Get Available Cities")
    
    try:
        response = requests.get(f"{BASE_URL}/api/satellite/cities")
        data = response.json()
        
        if data.get('success'):
            print(f"✅ Found {data['count']} predefined cities:")
            for i, city in enumerate(data['cities'][:5], 1):
                print(f"  {i}. {city['name']}")
                print(f"     Center: {city['center']}")
            if data['count'] > 5:
                print(f"  ... and {data['count'] - 5} more")
        else:
            print("❌ Failed to get cities")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_analyze_city(city_name: str, days: int = 90):
    """Test analyzing a specific city"""
    print_section(f"🛰️ Test 2: Analyze {city_name}")
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/satellite/analyze",
            params={'city': city_name, 'days': days}
        )
        data = response.json()
        
        if data.get('success'):
            location = data['location']
            analysis = data['analysis']
            
            print(f"✅ Location: {location['name']}")
            print(f"   Center: {location['center']}")
            print(f"   Source: {location['source']}")
            print(f"\n📊 Analysis Results:")
            print(f"   Status: {analysis['status'].upper()}")
            print(f"   Pollution Level: {analysis['level']}/5")
            print(f"   Trend: {analysis['trend']}")
            print(f"   Average FDI: {analysis['avgFdi']}")
            print(f"   Recent Average: {analysis['recentAvg']}")
            print(f"\n📈 Data Points: {len(data['data'])}")
            print(f"   Date Range: {data['dateRange']['start']} to {data['dateRange']['end']}")
            
            if data.get('usingMockData'):
                print("\n⚠️  Using mock data (Earth Engine not initialized)")
            else:
                print("\n✓ Using real satellite data from Google Earth Engine")
                
        else:
            print(f"❌ Failed to analyze {city_name}")
            print(f"   Error: {data.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_custom_location():
    """Test analyzing custom coordinates"""
    print_section("📍 Test 3: Analyze Custom Location (Great Barrier Reef)")
    
    try:
        payload = {
            "name": "Great Barrier Reef",
            "coordinates": [145.0, -16.5, 146.0, -15.5],
            "days": 60
        }
        
        response = requests.post(
            f"{BASE_URL}/api/satellite/custom",
            json=payload
        )
        data = response.json()
        
        if data.get('success'):
            location = data['location']
            analysis = data['analysis']
            
            print(f"✅ Location: {location['name']}")
            print(f"   Center: {location['center']}")
            print(f"\n📊 Analysis Results:")
            print(f"   Status: {analysis['status'].upper()}")
            print(f"   Pollution Level: {analysis['level']}/5")
            print(f"   Trend: {analysis['trend']}")
            print(f"   Average FDI: {analysis['avgFdi']}")
            
            if data.get('usingMockData'):
                print("\n⚠️  Using mock data (Earth Engine not initialized)")
            else:
                print("\n✓ Using real satellite data from Google Earth Engine")
                
        else:
            print("❌ Failed to analyze custom location")
            print(f"   Error: {data.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_multiple_cities():
    """Test analyzing multiple cities for comparison"""
    print_section("🌐 Test 4: Compare Multiple Cities")
    
    cities = ["Mumbai", "Tokyo", "New York", "Sydney"]
    results = []
    
    for city in cities:
        try:
            response = requests.get(
                f"{BASE_URL}/api/satellite/analyze",
                params={'city': city, 'days': 30}
            )
            data = response.json()
            
            if data.get('success'):
                results.append({
                    'city': data['location']['name'].split(',')[0],
                    'status': data['analysis']['status'],
                    'level': data['analysis']['level'],
                    'fdi': data['analysis']['avgFdi']
                })
        except:
            pass
    
    if results:
        print("✅ Comparison Results:\n")
        print(f"{'City':<20} {'Status':<12} {'Level':<8} {'Avg FDI':<10}")
        print("-" * 60)
        
        for r in sorted(results, key=lambda x: x['level']):
            status_icon = "🟢" if r['level'] <= 2 else "🟡" if r['level'] == 3 else "🔴"
            print(f"{status_icon} {r['city']:<18} {r['status']:<12} {r['level']}/5      {r['fdi']}")
    else:
        print("❌ Failed to compare cities")

def main():
    """Run all tests"""
    print("\n" + "🛰️ "*20)
    print("  OCEANHUB SATELLITE ANALYSIS API TEST")
    print("🛰️ "*20)
    
    print("\n📝 Testing satellite monitoring endpoints...")
    print("   Make sure your backend is running on http://localhost:5001")
    
    input("\nPress Enter to start tests...")
    
    # Run tests
    test_get_cities()
    
    input("\nPress Enter to continue...")
    test_analyze_city("Mumbai", days=90)
    
    input("\nPress Enter to continue...")
    test_analyze_city("Tokyo", days=60)
    
    input("\nPress Enter to continue...")
    test_custom_location()
    
    input("\nPress Enter to continue...")
    test_multiple_cities()
    
    print_section("✅ All Tests Complete!")
    print("\n💡 Tips:")
    print("  - Try analyzing any coastal city by name")
    print("  - Use custom coordinates for precise locations")
    print("  - Adjust 'days' parameter for different time ranges")
    print("  - Check SATELLITE_API_GUIDE.md for full documentation")
    print("\n🌊 Happy analyzing! 🛰️\n")

if __name__ == "__main__":
    main()

