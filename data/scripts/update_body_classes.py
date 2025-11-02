"""
Update Body Classes in Elasticsearch
Updates all vehicle documents in autos-unified index with classified body classes
Uses BodyClassClassifier for rule-based classification
"""

from elasticsearch import Elasticsearch
from elasticsearch.helpers import scan, bulk
from body_class_classifier import BodyClassClassifier
import sys
from datetime import datetime
import json


def connect_to_elasticsearch():
    """
    Connect to Elasticsearch
    Tries both Thor direct connection and Kubernetes service
    """
    connection_urls = [
        'http://thor:30398',  # Thor node direct (development)
        'http://elasticsearch.data.svc.cluster.local:9200',  # K8s service
        'http://192.168.0.244:30398',  # Thor IP direct
    ]

    for url in connection_urls:
        try:
            es = Elasticsearch([url], timeout=30)
            if es.ping():
                print(f"✅ Connected to Elasticsearch: {url}")
                return es
        except Exception as e:
            print(f"⚠️  Failed to connect to {url}: {e}")
            continue

    print("❌ Could not connect to Elasticsearch")
    sys.exit(1)


def fetch_all_vehicles(es, index_name='autos-unified'):
    """
    Fetch all vehicle documents from Elasticsearch using scroll API
    Returns list of documents with _id
    """
    print(f"\n📡 Fetching all documents from {index_name}...")

    query = {
        "query": {
            "match_all": {}
        }
    }

    documents = []

    try:
        # Use scan helper for efficient scrolling
        for doc in scan(
            es,
            index=index_name,
            query=query,
            scroll='5m',
            size=1000,
            _source=True
        ):
            documents.append({
                '_id': doc['_id'],
                '_source': doc['_source']
            })

            # Progress indicator
            if len(documents) % 1000 == 0:
                print(f"   ... fetched {len(documents):,} documents")

        print(f"✅ Fetched {len(documents):,} total documents")
        return documents

    except Exception as e:
        print(f"❌ Error fetching documents: {e}")
        sys.exit(1)


def classify_and_prepare_updates(documents, classifier):
    """
    Classify all vehicles and prepare bulk update actions
    Returns list of update actions for bulk API
    """
    print(f"\n🔍 Classifying {len(documents):,} vehicles...")

    update_actions = []
    classification_report = []

    for i, doc in enumerate(documents):
        source = doc['_source']

        manufacturer = source.get('manufacturer', 'Unknown')
        model = source.get('model', 'Unknown')
        year = source.get('year', 2000)

        # Classify vehicle
        body_class, match_type = classifier.classify(manufacturer, model, year)

        # Prepare update action
        update_actions.append({
            '_op_type': 'update',
            '_index': 'autos-unified',
            '_id': doc['_id'],
            'doc': {
                'body_class': body_class,
                'body_class_updated_at': datetime.utcnow().isoformat(),
                'body_class_match_type': match_type
            }
        })

        # Track for report
        classification_report.append({
            'vehicle_id': doc['_id'],
            'manufacturer': manufacturer,
            'model': model,
            'year': year,
            'body_class': body_class,
            'match_type': match_type
        })

        # Progress indicator
        if (i + 1) % 1000 == 0:
            print(f"   ... classified {i + 1:,} vehicles")

    print(f"✅ Classified {len(documents):,} vehicles")

    return update_actions, classification_report


def bulk_update_elasticsearch(es, update_actions, index_name='autos-unified'):
    """
    Perform bulk update to Elasticsearch
    """
    print(f"\n📤 Updating {len(update_actions):,} documents in Elasticsearch...")

    try:
        success, failed = bulk(
            es,
            update_actions,
            index=index_name,
            chunk_size=500,
            request_timeout=60,
            raise_on_error=False,
            stats_only=True
        )

        print(f"✅ Successfully updated: {success:,} documents")

        if failed > 0:
            print(f"⚠️  Failed to update: {failed:,} documents")

        return success, failed

    except Exception as e:
        print(f"❌ Error during bulk update: {e}")
        return 0, len(update_actions)


def save_classification_report(report, filename='body_class_update_report.json'):
    """Save classification report to JSON file"""
    print(f"\n💾 Saving classification report to {filename}...")

    try:
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"✅ Report saved successfully")
    except Exception as e:
        print(f"⚠️  Error saving report: {e}")


def verify_updates(es, index_name='autos-unified'):
    """
    Verify updates by querying Elasticsearch
    Shows body class distribution
    """
    print(f"\n🔍 Verifying updates...")

    try:
        # Aggregate by body_class
        agg_query = {
            "size": 0,
            "aggs": {
                "body_classes": {
                    "terms": {
                        "field": "body_class.keyword",
                        "size": 50,
                        "order": {"_count": "desc"}
                    }
                }
            }
        }

        result = es.search(index=index_name, body=agg_query)

        buckets = result['aggregations']['body_classes']['buckets']

        print(f"\n{'Body Class':<20} {'Count':<10} {'Percentage'}")
        print("-" * 50)

        total = result['hits']['total']['value']

        for bucket in buckets:
            body_class = bucket['key']
            count = bucket['doc_count']
            percentage = (count / total) * 100
            print(f"{body_class:<20} {count:<10,} {percentage:>5.1f}%")

        # Check for any remaining "Unknown"
        unknown_count = next(
            (b['doc_count'] for b in buckets if b['key'] == 'Unknown'),
            0
        )

        if unknown_count == 0:
            print("\n✅ SUCCESS: No vehicles with 'Unknown' body class!")
        else:
            print(f"\n⚠️  WARNING: {unknown_count:,} vehicles still have 'Unknown' body class")

        return total, buckets

    except Exception as e:
        print(f"❌ Error verifying updates: {e}")
        return 0, []


def main():
    """Main execution function"""
    print("\n" + "=" * 70)
    print("🚗 AUTOS - Body Class Update Script")
    print("=" * 70)
    print("\nThis script will:")
    print("  1. Fetch all vehicle documents from Elasticsearch")
    print("  2. Classify each vehicle using rule-based patterns")
    print("  3. Update all documents with new body_class values")
    print("  4. Generate classification report")
    print("  5. Verify results")
    print("\n" + "=" * 70)

    # Confirm before proceeding
    response = input("\n⚠️  Proceed with body class update? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Aborted.")
        return

    # Connect to Elasticsearch
    es = connect_to_elasticsearch()

    # Get current index stats
    try:
        count_response = es.count(index='autos-unified')
        current_count = count_response['count']
        print(f"\n📊 Current index contains: {current_count:,} documents")
    except Exception as e:
        print(f"⚠️  Could not get document count: {e}")

    # Initialize classifier
    print("\n🔧 Initializing Body Class Classifier...")
    classifier = BodyClassClassifier()
    print("✅ Classifier initialized")

    # Fetch all documents
    documents = fetch_all_vehicles(es)

    # Classify and prepare updates
    update_actions, classification_report = classify_and_prepare_updates(
        documents,
        classifier
    )

    # Bulk update Elasticsearch
    success, failed = bulk_update_elasticsearch(es, update_actions)

    # Refresh index
    print("\n🔄 Refreshing Elasticsearch index...")
    try:
        es.indices.refresh(index='autos-unified')
        print("✅ Index refreshed")
    except Exception as e:
        print(f"⚠️  Error refreshing index: {e}")

    # Print classifier statistics
    classifier.print_statistics()

    # Save classification report
    save_classification_report(classification_report)

    # Verify updates
    total, buckets = verify_updates(es)

    # Final summary
    print("\n" + "=" * 70)
    print("📊 FINAL SUMMARY")
    print("=" * 70)
    print(f"Total documents:       {total:,}")
    print(f"Successfully updated:  {success:,}")
    print(f"Failed updates:        {failed:,}")
    print(f"Unique body classes:   {len(buckets)}")
    print("=" * 70)

    print("\n✅ Body class update complete!")
    print(f"📄 Classification report saved to: body_class_update_report.json")
    print("\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Update interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
