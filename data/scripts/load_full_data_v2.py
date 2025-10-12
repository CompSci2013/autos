"""Load full NHTSA dataset into Elasticsearch"""
from elasticsearch import Elasticsearch
import requests
import sys
from datetime import datetime
import time

def fetch_all_makes():
    """Fetch all vehicle makes from NHTSA API"""
    url = "https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json"
    
    try:
        print("📡 Fetching all makes from NHTSA...")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        makes = data.get('Results', [])
        print(f"✅ Found {len(makes)} makes in NHTSA database")
        return makes
    except Exception as e:
        print(f"❌ Error fetching makes: {e}")
        return []

def fetch_nhtsa_models_by_year(make_name, year):
    """Fetch models from NHTSA API for a specific make and year"""
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/{make_name}/modelyear/{year}?format=json"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get('Results', [])
    except Exception as e:
        print(f"   ⚠️  Error fetching {make_name} {year}: {e}")
        return []

def load_full_data():
    """Load complete vehicle dataset into Elasticsearch"""
    
    # Connect to Elasticsearch
    es = Elasticsearch(['http://thor:30398'])
    
    index_name = "autos-unified"
    
    # Check current document count
    try:
        current_count = es.count(index=index_name)['count']
        print(f"📊 Current index contains: {current_count} documents")
        
        response = input("\n⚠️  This will ADD to existing data. Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            return
    except:
        print("⚠️  Index not found or empty")
    
    # Fetch all makes
    all_makes = fetch_all_makes()
    
    if not all_makes:
        print("❌ No makes found. Exiting.")
        return
    
    # Focus on major American manufacturers (expandable list)
    target_makes = [
        # Big Three
        "Ford", "Chevrolet", "Dodge", "Chrysler",
        # GM Brands
        "Pontiac", "Buick", "Cadillac", "Oldsmobile", "GMC", "Saturn",
        # Ford Brands
        "Lincoln", "Mercury",
        # Chrysler Brands
        "Plymouth", "Jeep", "Ram", "Eagle",
        # American Motors
        "AMC",
        # Independents
        "Studebaker", "Packard", "Nash", "Hudson", "Kaiser", "Willys",
        # Modern American
        "Tesla", "Rivian", "Lucid"
    ]
    
    # Filter to only target makes
    makes_to_process = [m for m in all_makes if m['Make_Name'] in target_makes]
    
    print(f"\n🎯 Processing {len(makes_to_process)} American manufacturers")
    print("=" * 70)
    
    # Sample years for assignment (classic to modern)
    sample_years = [
        1950, 1953, 1955, 1957, 1960, 1963, 1965, 1967, 1970, 1972,
        1975, 1978, 1980, 1983, 1985, 1988, 1990, 1993, 1995, 1998,
        2000, 2003, 2005, 2008, 2010, 2013, 2015, 2018, 2020, 2023
    ]
    
    total_loaded = 0
    total_skipped = 0
    makes_processed = 0
    
    for make_data in makes_to_process:
        make_name = make_data['Make_Name']
        makes_processed += 1
        
        print(f"\n[{makes_processed}/{len(makes_to_process)}] 📡 Fetching {make_name}...")
        
        models = fetch_nhtsa_models(make_name)
        
        if not models:
            print(f"   ⚠️  No models found for {make_name}")
            continue
        
        print(f"   Found {len(models)} models")
        
        # Load ALL models (not limited to 10)
        for i, model_data in enumerate(models):
            # Assign a sample year (cycle through our list)
            year = sample_years[i % len(sample_years)]
            
            model_name = model_data.get('Model_Name', 'Unknown')
            
            # Skip if model name is empty or just whitespace
            if not model_name or not model_name.strip():
                total_skipped += 1
                continue
            
            # Create unique document ID
            doc_id = f"nhtsa-{make_name.lower()}-{model_name.lower().replace(' ', '-')}-{year}"
            
            # Create document
            doc = {
                "vehicle_id": doc_id,
                "manufacturer": model_data.get('Make_Name', make_name),
                "model": model_name.strip(),
                "year": year,
                "body_class": "Unknown",  # NHTSA doesn't provide this in GetModelsForMake
                "data_source": "nhtsa_vpic_full",
                "ingested_at": datetime.utcnow().isoformat()
            }
            
            # Index document
            try:
                es.index(index=index_name, id=doc_id, document=doc)
                total_loaded += 1
                
                # Progress indicator every 50 documents
                if total_loaded % 50 == 0:
                    print(f"   ... {total_loaded} documents indexed")
                
            except Exception as e:
                print(f"   ⚠️  Error indexing {make_name} {model_name}: {e}")
                total_skipped += 1
        
        print(f"   ✅ Loaded {len(models)} models from {make_name}")
        
        # Small delay to be nice to NHTSA API
        time.sleep(0.5)
    
    # Refresh index
    print("\n🔄 Refreshing Elasticsearch index...")
    es.indices.refresh(index=index_name)
    
    print("\n" + "=" * 70)
    print(f"\n✅ Full data load complete!")
    print(f"   Documents loaded: {total_loaded}")
    print(f"   Documents skipped: {total_skipped}")
    
    # Verify final count
    count_response = es.count(index=index_name)
    print(f"📊 Index now contains: {count_response['count']} total documents")
    
    # Show summary by manufacturer
    print(f"\n📋 Manufacturer Summary:\n")
    
    agg_query = {
        "size": 0,
        "aggs": {
            "manufacturers": {
                "terms": {
                    "field": "manufacturer.keyword",
                    "size": 50,
                    "order": {"_count": "desc"}
                }
            }
        }
    }
    
    result = es.search(index=index_name, body=agg_query)
    
    print(f"{'Manufacturer':<20} {'Models':<10}")
    print("-" * 30)
    for bucket in result['aggregations']['manufacturers']['buckets']:
        mfr = bucket['key']
        count = bucket['doc_count']
        print(f"{mfr:<20} {count:<10}")

if __name__ == "__main__":
    print("\n🚗 Loading FULL NHTSA Dataset into AUTOS\n")
    print("=" * 70)
    print("\nThis will load ALL models from major American manufacturers")
    print("Estimated: 2,000-5,000 vehicles")
    print("Estimated time: 15-30 minutes")
    print("\n" + "=" * 70)
    
    try:
        load_full_data()
        print("\n" + "=" * 70)
        print("\n✅ Full dataset loaded successfully!\n")
    except KeyboardInterrupt:
        print("\n\n⚠️  Load interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)