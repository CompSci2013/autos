#!/usr/bin/env python3
"""
Load VIN Data into Elasticsearch

Reads vin_data_15k.json and bulk loads into autos-vins index
"""

import json
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

ES_HOST = 'http://10.43.133.216:9200'
INDEX_NAME = 'autos-vins'
DATA_FILE = 'vin_data_15k.json'


def load_vin_data():
    """Load VIN data from JSON file into Elasticsearch"""
    print(f"Connecting to Elasticsearch: {ES_HOST}")
    es = Elasticsearch([ES_HOST])

    # Check if index exists
    if not es.indices.exists(index=INDEX_NAME):
        print(f"❌ Index '{INDEX_NAME}' does not exist!")
        print(f"   Run: python create_vins_index.py")
        return

    # Load JSON data
    print(f"\nLoading VIN data from {DATA_FILE}...")
    with open(DATA_FILE, 'r') as f:
        vins = json.load(f)

    print(f"Loaded {len(vins)} VIN records from file")

    # Prepare bulk actions
    print(f"\nPreparing bulk index operations...")
    actions = []
    for vin in vins:
        action = {
            "_index": INDEX_NAME,
            "_id": vin['vin'],  # Use VIN as document ID
            "_source": vin
        }
        actions.append(action)

    # Bulk index
    print(f"Bulk indexing {len(actions)} documents...")
    success, failed = bulk(es, actions, raise_on_error=False, stats_only=False)

    print(f"\n✅ Bulk indexing complete!")
    print(f"   Success: {success}")
    print(f"   Failed: {len(failed) if isinstance(failed, list) else 0}")

    # Refresh index
    es.indices.refresh(index=INDEX_NAME)

    # Verify count
    count = es.count(index=INDEX_NAME)['count']
    print(f"\n📊 Index '{INDEX_NAME}' now contains {count} documents")

    # Show sample queries
    print(f"\n" + "="*60)
    print(f"Sample Elasticsearch Queries:")
    print(f"="*60)
    print(f"\n# Get VINs for specific vehicle:")
    print(f'POST /autos-vins/_search')
    print(f'{{')
    print(f'  "query": {{ "term": {{ "vehicle_id": "nhtsa-ram-best-lane-enterprises-dba-ramp-free-1960" }} }},')
    print(f'  "size": 20,')
    print(f'  "from": 0')
    print(f'}}')

    print(f"\n# Filter by manufacturer and year range:")
    print(f'POST /autos-vins/_search')
    print(f'{{')
    print(f'  "query": {{')
    print(f'    "bool": {{')
    print(f'      "must": [')
    print(f'        {{ "term": {{ "manufacturer": "Ford" }} }},')
    print(f'        {{ "range": {{ "year": {{ "gte": 1965, "lte": 1970 }} }} }}')
    print(f'      ]')
    print(f'    }}')
    print(f'  }}')
    print(f'}}')

    print(f"\n# Aggregate by body class:")
    print(f'POST /autos-vins/_search')
    print(f'{{')
    print(f'  "size": 0,')
    print(f'  "aggs": {{')
    print(f'    "by_body_class": {{')
    print(f'      "terms": {{ "field": "body_class", "size": 10 }}')
    print(f'    }}')
    print(f'  }}')
    print(f'}}')


if __name__ == '__main__':
    load_vin_data()
