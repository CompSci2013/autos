"""Create Elasticsearch index for AUTOS project"""
from elasticsearch import Elasticsearch
import sys

def create_autos_index():
    """Create autos-unified index with mappings"""
    
    # Connect to Elasticsearch
    es = Elasticsearch(['http://thor:30398'])
    
    index_name = "autos-unified"
    
    # Check if index already exists
    if es.indices.exists(index=index_name):
        print(f"⚠️  Index '{index_name}' already exists")
        response = input("Delete and recreate? (yes/no): ")
        if response.lower() == 'yes':
            es.indices.delete(index=index_name)
            print(f"🗑️  Deleted existing index")
        else:
            print("Skipping index creation")
            return
    
    # Define index settings and mappings
    index_body = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "analysis": {
                "analyzer": {
                    "vehicle_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "asciifolding"]
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                # Core identification
                "vehicle_id": {"type": "keyword"},
                
                # Manufacturer (searchable + keyword for aggregations)
                "manufacturer": {
                    "type": "text",
                    "analyzer": "vehicle_analyzer",
                    "fields": {
                        "keyword": {"type": "keyword"}
                    }
                },
                
                # Model (searchable + keyword for aggregations)
                "model": {
                    "type": "text",
                    "analyzer": "vehicle_analyzer",
                    "fields": {
                        "keyword": {"type": "keyword"}
                    }
                },
                
                # Year
                "year": {"type": "integer"},
                
                # Body style/type
                "body_style": {"type": "keyword"},
                "body_class": {"type": "keyword"},
                
                # VIN
                "vin": {"type": "keyword"},
                
                # Engine specs
                "engine_type": {"type": "keyword"},
                "engine_cylinders": {"type": "integer"},
                "engine_displacement_l": {"type": "float"},
                "engine_hp": {"type": "integer"},
                
                # Transmission
                "transmission_type": {"type": "keyword"},
                "transmission_speeds": {"type": "integer"},
                "drive_type": {"type": "keyword"},
                
                # Metadata
                "data_source": {"type": "keyword"},
                "ingested_at": {"type": "date"}
            }
        }
    }
    
    # Create the index
    es.indices.create(index=index_name, body=index_body)
    print(f"✅ Created index: {index_name}")
    
    # Verify creation
    info = es.indices.get(index=index_name)
    print(f"📊 Index settings:")
    print(f"   - Shards: {info[index_name]['settings']['index']['number_of_shards']}")
    print(f"   - Replicas: {info[index_name]['settings']['index']['number_of_replicas']}")
    print(f"   - Mappings: {len(info[index_name]['mappings']['properties'])} fields")
    
    # Test write/read
    test_doc = {
        "vehicle_id": "test-001",
        "manufacturer": "Ford",
        "model": "F-150",
        "year": 1965,
        "body_class": "Pickup Truck",
        "data_source": "test"
    }
    
    es.index(index=index_name, id="test-001", document=test_doc)
    print(f"✅ Test document indexed")
    
    # Retrieve it
    doc = es.get(index=index_name, id="test-001")
    print(f"✅ Test document retrieved: {doc['_source']['manufacturer']} {doc['_source']['model']}")
    
    # Delete test document
    es.delete(index=index_name, id="test-001")
    es.indices.refresh(index=index_name)
    print(f"✅ Test document cleaned up")
    
    print(f"\n✅ Index '{index_name}' is ready for data!")


if __name__ == "__main__":
    print("\n🔧 Creating Elasticsearch Index for AUTOS\n")
    print("=" * 60)
    
    try:
        create_autos_index()
        print("=" * 60)
        print("\n✅ Setup complete!\n")
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        sys.exit(1)
