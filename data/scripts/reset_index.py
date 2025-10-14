"""Reset the autos-unified index"""
from elasticsearch import Elasticsearch
import sys

es = Elasticsearch(['http://thor:30398'])
index_name = "autos-unified"

print("\n⚠️  WARNING: This will DELETE all existing vehicle data!\n")
response = input("Delete ALL existing data and recreate index? (yes/no): ")

if response.lower() == 'yes':
    try:
        # Delete index
        es.indices.delete(index=index_name)
        print("🗑️  Index deleted")
        print("\n✅ Now run: python3 create_autos_index.py")
    except Exception as e:
        print(f"❌ Error deleting index: {e}")
        sys.exit(1)
else:
    print("Aborted. Keeping existing data.")
    sys.exit(0)
