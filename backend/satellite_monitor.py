"""
Satellite Monitoring Module for OceanEye
Integrates Google Earth Engine for ocean health monitoring
"""
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
import requests

try:
    import ee
    EE_AVAILABLE = True
except ImportError:
    EE_AVAILABLE = False
    print("Warning: earthengine-api not installed. Satellite features will use mock data.")

# Configuration
MUMBAI_AOI = {
    'coordinates': [72.775, 18.875, 72.985, 19.255],
    'center': [19.0760, 72.8777],
    'name': 'Mumbai Coast'
}

# Popular coastal cities with predefined coordinates
COASTAL_CITIES = {
    'mumbai': {'coordinates': [72.775, 18.875, 72.985, 19.255], 'center': [19.0760, 72.8777]},
    'new york': {'coordinates': [-74.05, 40.65, -73.95, 40.75], 'center': [40.7128, -74.0060]},
    'san francisco': {'coordinates': [-122.52, 37.70, -122.35, 37.82], 'center': [37.7749, -122.4194]},
    'los angeles': {'coordinates': [-118.50, 33.70, -118.15, 34.05], 'center': [34.0522, -118.2437]},
    'miami': {'coordinates': [-80.30, 25.70, -80.10, 25.85], 'center': [25.7617, -80.1918]},
    'singapore': {'coordinates': [103.60, 1.15, 104.05, 1.47], 'center': [1.3521, 103.8198]},
    'sydney': {'coordinates': [151.15, -33.95, 151.30, -33.80], 'center': [-33.8688, 151.2093]},
    'tokyo': {'coordinates': [139.70, 35.60, 139.90, 35.75], 'center': [35.6762, 139.6503]},
    'hong kong': {'coordinates': [114.10, 22.25, 114.30, 22.40], 'center': [22.3193, 114.1694]},
    'dubai': {'coordinates': [55.10, 25.05, 55.40, 25.30], 'center': [25.2048, 55.2708]},
    'barcelona': {'coordinates': [2.10, 41.35, 2.25, 41.45], 'center': [41.3851, 2.1734]},
    'rio de janeiro': {'coordinates': [-43.30, -23.05, -43.10, -22.85], 'center': [-22.9068, -43.1729]},
}

def geocode_city(city_name: str) -> Optional[Dict[str, Any]]:
    """
    Convert city name to coordinates using Nominatim (OpenStreetMap)
    Returns AOI coordinates and center point
    """
    # Check predefined cities first
    city_lower = city_name.lower().strip()
    if city_lower in COASTAL_CITIES:
        return {
            'name': city_name.title(),
            'coordinates': COASTAL_CITIES[city_lower]['coordinates'],
            'center': COASTAL_CITIES[city_lower]['center'],
            'source': 'predefined'
        }
    
    # Use Nominatim API for geocoding
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': city_name,
            'format': 'json',
            'limit': 1
        }
        headers = {
            'User-Agent': 'OceanHub-SatelliteMonitor/1.0'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=5)
        data = response.json()
        
        if data and len(data) > 0:
            result = data[0]
            lat = float(result['lat'])
            lon = float(result['lon'])
            
            # Create AOI box around the city (approximately 20km radius)
            lat_offset = 0.18  # ~20km in latitude
            lon_offset = 0.18  # ~20km in longitude (varies by latitude)
            
            return {
                'name': result.get('display_name', city_name),
                'coordinates': [
                    lon - lon_offset,
                    lat - lat_offset,
                    lon + lon_offset,
                    lat + lat_offset
                ],
                'center': [lat, lon],
                'source': 'geocoded'
            }
    except Exception as e:
        print(f"Geocoding error for {city_name}: {e}")
    
    return None

class SatelliteMonitor:
    """Monitor ocean health using satellite imagery"""
    
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id or os.environ.get('GEE_PROJECT_ID', 'nidaan-ai')
        self.initialized = False
        
        if EE_AVAILABLE and self.project_id:
            try:
                ee.Initialize(project=self.project_id)
                self.initialized = True
                print(f"✓ Earth Engine initialized with project: {self.project_id}")
            except Exception as e:
                print(f"⚠ Failed to initialize Earth Engine: {e}")
                print(f"  Run 'earthengine authenticate' to set up credentials")
                self.initialized = False
    
    def calculate_indices(self, image):
        """Calculate NDCI, NDWI, NDVI, and FDI from Sentinel-2 image"""
        if not EE_AVAILABLE or not self.initialized:
            return None
            
        red_edge_band = image.select('B5')
        red_band = image.select('B4')
        green_band = image.select('B3')
        nir_band = image.select('B8')
        swir1_band = image.select('B11')
        
        # NDCI - Normalized Difference Chlorophyll Index
        ndci = red_edge_band.subtract(red_band).divide(
            red_edge_band.add(red_band)
        ).rename('NDCI')
        
        # NDWI - Normalized Difference Water Index
        ndwi = green_band.subtract(nir_band).divide(
            green_band.add(nir_band)
        ).rename('NDWI')
        
        # NDVI - Normalized Difference Vegetation Index
        ndvi = nir_band.subtract(red_band).divide(
            nir_band.add(red_band)
        ).rename('NDVI')
        
        # FDI - Floating Debris Index
        fdi = nir_band.subtract(swir1_band).rename('FDI')
        
        return image.addBands([ndci, ndwi, ndvi, fdi])
    
    def get_time_series_data(
        self,
        aoi_coords: List[float],
        start_date: str,
        end_date: str
    ) -> List[Dict[str, Any]]:
        """Get time series data for indices"""
        
        if not EE_AVAILABLE or not self.initialized:
            # Return mock data for development
            return self._generate_mock_data(start_date, end_date)
        
        try:
            # Define AOI
            aoi = ee.Geometry.Rectangle(aoi_coords)
            
            # Filter Sentinel-2 Harmonized collection (improved dataset)
            sentinel2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED') \
                         .filterBounds(aoi) \
                         .filterDate(start_date, end_date) \
                         .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
                         .map(self.calculate_indices)
            
            # Reduce to get mean values
            def reduce_region(image):
                stats = image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=aoi,
                    scale=30,
                    maxPixels=1e8,
                    bestEffort=True
                )
                return ee.Feature(None, stats).set('date', image.date().format())
            
            indices = sentinel2.map(reduce_region).getInfo()['features']
            
            # Format data
            results = []
            for feature in indices:
                props = feature['properties']
                results.append({
                    'date': props.get('date'),
                    'ndci': props.get('NDCI'),
                    'ndwi': props.get('NDWI'),
                    'ndvi': props.get('NDVI'),
                    'fdi': props.get('FDI')
                })
            
            return results
            
        except Exception as e:
            print(f"Error fetching satellite data: {e}")
            return self._generate_mock_data(start_date, end_date)
    
    def _generate_mock_data(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Generate realistic mock data for development"""
        import random
        from datetime import datetime, timedelta
        
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        
        results = []
        current = start
        
        while current <= end:
            # Generate realistic values with some variation
            base_pollution = 0.3 + random.uniform(-0.1, 0.1)
            
            results.append({
                'date': current.strftime('%Y-%m-%d'),
                'ndci': round(0.2 + random.uniform(-0.05, 0.05), 3),  # Chlorophyll
                'ndwi': round(0.4 + random.uniform(-0.1, 0.1), 3),    # Water
                'ndvi': round(0.15 + random.uniform(-0.05, 0.05), 3), # Vegetation
                'fdi': round(base_pollution + random.uniform(-0.1, 0.1), 3)  # Debris
            })
            
            current += timedelta(days=7)  # Weekly data
        
        return results
    
    def get_latest_image_url(self, aoi_coords: List[float]) -> Optional[str]:
        """Get URL for latest satellite image visualization"""
        
        if not EE_AVAILABLE or not self.initialized:
            return None
        
        try:
            aoi = ee.Geometry.Rectangle(aoi_coords)
            
            # Get latest image
            image = ee.ImageCollection('COPERNICUS/S2_HARMONIZED') \
                     .filterBounds(aoi) \
                     .filterDate(
                         (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
                         datetime.now().strftime('%Y-%m-%d')
                     ) \
                     .sort('CLOUD_COVER') \
                     .first()
            
            # Calculate FDI
            image_with_fdi = self.calculate_indices(image)
            fdi_image = image_with_fdi.select('FDI')
            
            # Get map ID
            map_id = fdi_image.getMapId({
                'min': -1,
                'max': 1,
                'palette': ['blue', 'white', 'red']
            })
            
            return map_id['tile_fetcher'].url_format
            
        except Exception as e:
            print(f"Error getting image URL: {e}")
            return None
    
    def analyze_pollution_level(self, fdi_values: List[float]) -> Dict[str, Any]:
        """Analyze pollution level from FDI values"""
        
        if not fdi_values:
            return {
                'status': 'unknown',
                'level': 0,
                'trend': 'stable'
            }
        
        avg_fdi = sum(fdi_values) / len(fdi_values)
        recent_avg = sum(fdi_values[-3:]) / min(3, len(fdi_values))
        older_avg = sum(fdi_values[:3]) / min(3, len(fdi_values))
        
        # Determine pollution level
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
        
        # Determine trend
        if recent_avg > older_avg + 0.05:
            trend = 'worsening'
        elif recent_avg < older_avg - 0.05:
            trend = 'improving'
        else:
            trend = 'stable'
        
        return {
            'status': status,
            'level': level,
            'trend': trend,
            'avgFdi': round(avg_fdi, 3),
            'recentAvg': round(recent_avg, 3)
        }


# Singleton instance
_monitor = None

def get_monitor() -> SatelliteMonitor:
    """Get or create satellite monitor instance"""
    global _monitor
    if _monitor is None:
        _monitor = SatelliteMonitor()
    return _monitor

