"""Load sample NHTSA data into Elasticsearch"""
from elasticsearch import Elasticsearch
import requests
import sys
from datetime import datetime

def fetch_nhtsa_models(make_name):
    """Fetch all models from NHTSA API for a specific make"""
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/{make_name}?format=json"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get('Results', [])
    except Exception as e:
        print(f"⚠️  Error fetching {make_name}: {e}")
        return []

def load_sample_data():
    """Load sample vehicle data into Elasticsearch"""
    
    # Connect to Elasticsearch
    es = Elasticsearch(['http://thor:30398'])
    
    index_name = "autos-unified"
    
    # Classic American manufacturers for MVP
    manufacturers = [
        "Ford",
        "Chevrolet", 
        "Dodge",
        "Plymouth",
        "Pontiac",
        "Buick"
    ]
    
    # Sample years to assign to models (for MVP data)
    sample_years = [1953, 1955, 1957, 1960, 1965, 1968, 1970, 1972]
    
    total_loaded = 0
    
    print(f"\n🔄 Fetching sample data from NHTSA vPIC API...\n")
    
    for make_name in manufacturers:
        print(f"📡 Fetching {make_name}...")
        models = fetch_nhtsa_models(make_name)
        
        # Limit to first 10 models per manufacturer for MVP
        for i, model_data in enumerate(models[:10]):
            # Assign a sample year (cycle through our list)
            year = sample_years[i % len(sample_years)]
            
            model_name = model_data.get('Model_Name', 'Unknown')
            
            # Create document
            doc = {
                "vehicle_id": f"nhtsa-{make_name.lower()}-{model_name.lower().replace(' ', '-')}-{year}",
                "manufacturer": model_data.get('Make_Name', make_name),
                "model": model_name,
                "year": year,
                "body_class": "Unknown",  # NHTSA doesn't provide this in GetModelsForMake
                "data_source": "nhtsa_vpic_sample",
                "ingested_at": datetime.utcnow().isoformat()
            }
            
            # Index document
            try:
                es.index(index=index_name, document=doc)
                total_loaded += 1
            except Exception as e:
                print(f"   ⚠️  Error indexing {make_name} {model_name}: {e}")
        
        print(f"   ✅ Loaded {min(len(models), 10)} models")
    
    # Refresh index
    es.indices.refresh(index=index_name)
    
    print(f"\n✅ Total documents loaded: {total_loaded}")
    
    # Verify count
    count_response = es.count(index=index_name)
    print(f"📊 Index now contains: {count_response['count']} documents")
    
    # Show sample aggregation (manufacturer-model combinations)
    print(f"\n📋 Sample Manufacturer-Model Combinations:\n")
    
    agg_query = {
        "size": 0,
        "aggs": {
            "manufacturers": {
                "terms": {"field": "manufacturer.keyword", "size": 10},
                "aggs": {
                    "models": {
                        "terms": {"field": "model.keyword", "size": 20}
                    }
                }
            }
        }
    }
    
    result = es.search(index=index_name, body=agg_query)
    
    for mfr_bucket in result['aggregations']['manufacturers']['buckets']:
        mfr = mfr_bucket['key']
        doc_count = mfr_bucket['doc_count']
        print(f"\n{mfr} ({doc_count} total):")
        for model_bucket in mfr_bucket['models']['buckets'][:5]:  # Show first 5
            model = model_bucket['key']
            count = model_bucket['doc_count']
            print(f"  - {model} ({count})")

if __name__ == "__main__":
    print("\n🚗 Loading Sample NHTSA Data into AUTOS\n")
    print("=" * 60)
    
    try:
        load_sample_data()
        print("\n" + "=" * 60)
        print("\n✅ Sample data loaded successfully!\n")
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)
