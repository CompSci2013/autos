"""
Test Body Class Classifier Against Real Elasticsearch Data
Fetches sample documents and classifies without updating
"""

from elasticsearch import Elasticsearch
from body_class_classifier import BodyClassClassifier
import sys
import random


def connect_to_elasticsearch():
    """Connect to Elasticsearch"""
    connection_urls = [
        'http://thor:30398',
        'http://elasticsearch.data.svc.cluster.local:9200',
        'http://192.168.0.244:30398',
    ]

    for url in connection_urls:
        try:
            es = Elasticsearch([url], timeout=30)
            if es.ping():
                print(f"✅ Connected to Elasticsearch: {url}")
                return es
        except:
            continue

    print("❌ Could not connect to Elasticsearch")
    sys.exit(1)


def fetch_sample_documents(es, sample_size=50, index_name='autos-unified'):
    """Fetch random sample of documents"""
    print(f"\n📡 Fetching {sample_size} sample documents...")

    try:
        # Get total count
        count_response = es.count(index=index_name)
        total = count_response['count']
        print(f"   Total documents in index: {total:,}")

        # Fetch random sample
        query = {
            "size": sample_size,
            "query": {
                "function_score": {
                    "query": {"match_all": {}},
                    "random_score": {}
                }
            }
        }

        result = es.search(index=index_name, body=query)

        documents = []
        for hit in result['hits']['hits']:
            documents.append({
                '_id': hit['_id'],
                '_source': hit['_source']
            })

        print(f"✅ Fetched {len(documents)} sample documents")
        return documents

    except Exception as e:
        print(f"❌ Error fetching documents: {e}")
        sys.exit(1)


def test_classifier_on_sample(documents, classifier):
    """Test classifier on sample documents"""
    print(f"\n🔍 Testing classifier on {len(documents)} documents...\n")

    print(f"{'Manufacturer':<15} {'Model':<25} {'Year':<6} {'Current':<15} {'New Class':<15} {'Match Type'}")
    print("-" * 115)

    for doc in documents:
        source = doc['_source']

        manufacturer = source.get('manufacturer', 'Unknown')
        model = source.get('model', 'Unknown')
        year = source.get('year', 2000)
        current_class = source.get('body_class', 'Unknown')

        # Classify
        new_class, match_type = classifier.classify(manufacturer, model, year)

        # Truncate long model names
        model_display = model[:24] if len(model) <= 24 else model[:21] + '...'

        print(f"{manufacturer:<15} {model_display:<25} {year:<6} {current_class:<15} {new_class:<15} {match_type}")

    # Print statistics
    classifier.print_statistics()


def main():
    """Main test function"""
    print("\n" + "=" * 70)
    print("🧪 Body Class Classifier - Sample Test")
    print("=" * 70)
    print("\nThis will test the classifier on real data WITHOUT making changes")
    print("=" * 70)

    # Connect
    es = connect_to_elasticsearch()

    # Initialize classifier
    print("\n🔧 Initializing classifier...")
    classifier = BodyClassClassifier()
    print("✅ Classifier ready")

    # Fetch sample
    sample_size = 50
    documents = fetch_sample_documents(es, sample_size=sample_size)

    # Test classifier
    test_classifier_on_sample(documents, classifier)

    print("\n" + "=" * 70)
    print("✅ Sample test complete - no changes made to Elasticsearch")
    print("=" * 70)
    print("\nTo update all documents, run: python3 update_body_classes.py")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
