#!/usr/bin/env python3
"""
Create Elasticsearch Index for VIN Data

Index name: autos-vins
Optimized for:
- VIN searches (keyword)
- Manufacturer/Model/Year/BodyClass filtering
- Mileage/Value range queries
- Full-text search on colors/options
"""

from elasticsearch import Elasticsearch

ES_HOST = 'http://10.43.133.216:9200'
INDEX_NAME = 'autos-vins'


def create_vins_index():
    """Create autos-vins index with optimized mapping"""
    print(f"Connecting to Elasticsearch: {ES_HOST}")
    es = Elasticsearch([ES_HOST])

    # Check if index exists
    if es.indices.exists(index=INDEX_NAME):
        print(f"Index '{INDEX_NAME}' already exists.")
        response = input(f"Delete and recreate? (yes/no): ")
        if response.lower() == 'yes':
            print(f"Deleting existing index '{INDEX_NAME}'...")
            es.indices.delete(index=INDEX_NAME)
        else:
            print("Aborted.")
            return

    print(f"Creating index '{INDEX_NAME}'...")

    # Index mapping
    mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "analysis": {
                "analyzer": {
                    "vin_analyzer": {
                        "type": "custom",
                        "tokenizer": "keyword",
                        "filter": ["lowercase"]
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                # VIN - Primary identifier
                "vin": {
                    "type": "keyword"
                },

                # NEW FIELDS - Vehicle identification
                "manufacturer": {
                    "type": "keyword"
                },
                "model": {
                    "type": "keyword"
                },
                "year": {
                    "type": "integer"
                },
                "body_class": {
                    "type": "keyword"
                },
                "vehicle_id": {
                    "type": "keyword"
                },

                # Condition
                "condition_rating": {
                    "type": "integer"
                },
                "condition_description": {
                    "type": "keyword"
                },

                # Mileage
                "mileage": {
                    "type": "integer"
                },
                "mileage_verified": {
                    "type": "boolean"
                },

                # Registration
                "registered_state": {
                    "type": "keyword"
                },
                "registration_status": {
                    "type": "keyword"
                },
                "title_status": {
                    "type": "keyword"
                },

                # Appearance
                "exterior_color": {
                    "type": "text",
                    "fields": {
                        "keyword": {
                            "type": "keyword"
                        }
                    }
                },

                # Options
                "factory_options": {
                    "type": "text",
                    "fields": {
                        "keyword": {
                            "type": "keyword"
                        }
                    }
                },

                # Value
                "estimated_value": {
                    "type": "integer"
                },
                "matching_numbers": {
                    "type": "boolean"
                },

                # Service
                "last_service_date": {
                    "type": "date",
                    "format": "yyyy-MM-dd"
                }
            }
        }
    }

    # Create index
    es.indices.create(index=INDEX_NAME, body=mapping)

    print(f"✅ Index '{INDEX_NAME}' created successfully!")
    print(f"\nIndex mapping:")
    print(f"  - VIN (keyword) - Primary identifier")
    print(f"  - Manufacturer (keyword) - NEW")
    print(f"  - Model (keyword) - NEW")
    print(f"  - Year (integer) - NEW")
    print(f"  - Body Class (keyword) - NEW")
    print(f"  - Vehicle ID (keyword) - Link to vehicle spec")
    print(f"  - Condition, Mileage, Registration, Color, Options, Value, Service Date")
    print(f"\nReady to load VIN data!")


if __name__ == '__main__':
    create_vins_index()
