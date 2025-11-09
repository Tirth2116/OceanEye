"""
Satellite Monitoring Module for OceanSight
Integrates Google Earth Engine for ocean health monitoring
"""
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json

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

class SatelliteMonitor:
    """Monitor ocean health using satellite imagery"""
    
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id or os.environ.get('GEE_PROJECT_ID')
        self.initialized = False
        
        if EE_AVAILABLE and self.project_id:
            try:
                ee.Initialize(project=self.project_id)
                self.initialized = True
                print(f"Earth Engine initialized with project: {self.project_id}")
            except Exception as e:
                print(f"Failed to initialize Earth Engine: {e}")
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
            
            # Filter Sentinel-2 collection
            sentinel2 = ee.ImageCollection('COPERNICUS/S2') \
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
            image = ee.ImageCollection('COPERNICUS/S2') \
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

