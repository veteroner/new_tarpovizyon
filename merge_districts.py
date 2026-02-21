#!/usr/bin/env python3
"""
Merge all district GeoJSON files into a single file
"""
import json
import os
from pathlib import Path

def merge_district_geojsons():
    base_path = Path("/Volumes/LaCie/dashboard-project/tarpo_bitkisel_harita/data/geojson")
    output_path = Path("/Volumes/LaCie/dashboard-project/public/turkey_districts.json")
    
    merged_features = []
    
    # Get all district JSON files
    district_files = sorted([f for f in base_path.glob("*_districts.json") if not f.name.startswith("._")])
    
    print(f"Found {len(district_files)} district files")
    
    for file_path in district_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                if 'features' in data:
                    # Extract province name from filename
                    province_name = file_path.stem.replace('_districts', '').title()
                    
                    # Add province info to each feature
                    for feature in data['features']:
                        if 'properties' not in feature:
                            feature['properties'] = {}
                        feature['properties']['province'] = province_name
                        merged_features.append(feature)
                    
                    print(f"✓ {province_name}: {len(data['features'])} districts")
        except Exception as e:
            print(f"✗ Error reading {file_path.name}: {e}")
    
    # Create merged GeoJSON
    merged_geojson = {
        "type": "FeatureCollection",
        "features": merged_features
    }
    
    # Save merged file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged_geojson, f, ensure_ascii=False, separators=(',', ':'))
    
    file_size = output_path.stat().st_size / (1024 * 1024)
    print(f"\n✓ Merged {len(merged_features)} districts into {output_path}")
    print(f"  File size: {file_size:.2f} MB")

if __name__ == '__main__':
    merge_district_geojsons()
