"""
Synthesize Complete Historical Vehicle Data (1908-2024)
Generates realistic vehicle records for every year based on actual production dates
"""

from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from body_class_classifier import BodyClassClassifier
import json
import sys
from datetime import datetime


def load_historical_database():
    """Load historical vehicles database"""
    try:
        with open('historical_vehicles_database.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ historical_vehicles_database.json not found")
        sys.exit(1)


def connect_to_elasticsearch():
    """Connect to Elasticsearch"""
    connection_urls = [
        'http://thor:30398',
        'http://elasticsearch.data.svc.cluster.local:9200',
        'http://192.168.0.244:30398',
    ]

    for url in connection_urls:
        try:
            es = Elasticsearch([url], request_timeout=30)
            if es.ping():
                print(f"✅ Connected to Elasticsearch: {url}")
                return es
        except:
            continue

    print("❌ Could not connect to Elasticsearch")
    sys.exit(1)


def generate_vehicle_records(historical_db, start_year=1908, end_year=2024):
    """
    Generate vehicle records for each year
    Returns list of vehicle documents ready for Elasticsearch
    """
    print(f"\n🏭 Generating vehicle records for {start_year}-{end_year}...")

    vehicles = []
    manufacturers_data = historical_db['manufacturers']

    for year in range(start_year, end_year + 1):
        year_count = 0

        for manufacturer, mfr_data in manufacturers_data.items():
            founded_year = mfr_data['founded']

            # Skip if manufacturer doesn't exist yet
            if year < founded_year:
                continue

            models_data = mfr_data['models']

            for model_name, model_info in models_data.items():
                year_range = model_info['years']
                body_class = model_info['body_class']

                # Check if this model was produced in this year
                if year_range[0] <= year <= year_range[1]:
                    # Create vehicle document
                    vehicle_id = f"synth-{manufacturer.lower()}-{model_name.lower().replace(' ', '-')}-{year}"

                    vehicle = {
                        'vehicle_id': vehicle_id,
                        'manufacturer': manufacturer,
                        'model': model_name,
                        'year': year,
                        'body_class': body_class,
                        'data_source': 'synthetic_historical',
                        'ingested_at': datetime.utcnow().isoformat(),
                        'synthesis_date': datetime.utcnow().isoformat()
                    }

                    vehicles.append(vehicle)
                    year_count += 1

        if (year - start_year + 1) % 10 == 0:
            print(f"   {year}: {year_count} models ({len(vehicles)} total so far)")

    print(f"✅ Generated {len(vehicles)} vehicle records across {end_year - start_year + 1} years")

    return vehicles


def load_to_elasticsearch(es, vehicles, index_name='autos-unified', batch_size=500):
    """
    Load synthesized vehicles into Elasticsearch using bulk API
    """
    print(f"\n📤 Loading {len(vehicles)} vehicles to Elasticsearch...")

    actions = []
    for vehicle in vehicles:
        action = {
            '_op_type': 'index',
            '_index': index_name,
            '_id': vehicle['vehicle_id'],
            '_source': vehicle
        }
        actions.append(action)

    # Bulk load in batches
    try:
        success, failed = bulk(
            es,
            actions,
            chunk_size=batch_size,
            request_timeout=60,
            raise_on_error=False,
            stats_only=True
        )

        print(f"✅ Successfully loaded: {success:,} vehicles")
        if failed > 0:
            print(f"⚠️  Failed to load: {failed:,} vehicles")

        return success, failed

    except Exception as e:
        print(f"❌ Error during bulk load: {e}")
        return 0, len(vehicles)


def verify_year_coverage(es, index_name='autos-unified'):
    """
    Verify complete year coverage
    """
    print(f"\n🔍 Verifying year coverage...")

    try:
        result = es.search(
            index=index_name,
            body={
                'size': 0,
                'aggs': {
                    'year_stats': {
                        'stats': {'field': 'year'}
                    },
                    'years': {
                        'terms': {
                            'field': 'year',
                            'size': 200,
                            'order': {'_key': 'asc'}
                        }
                    },
                    'data_sources': {
                        'terms': {'field': 'data_source.keyword'}
                    }
                }
            }
        )

        year_stats = result['aggregations']['year_stats']
        years = result['aggregations']['years']['buckets']
        sources = result['aggregations']['data_sources']['buckets']

        print(f"\n📊 Year Coverage:")
        print(f"   Min Year: {int(year_stats['min'])}")
        print(f"   Max Year: {int(year_stats['max'])}")
        print(f"   Total Years Represented: {len(years)}")
        print(f"   Expected Years (1908-2024): 117")

        missing_years = []
        for year in range(1908, 2025):
            if year not in [b['key'] for b in years]:
                missing_years.append(year)

        if missing_years:
            print(f"\n⚠️  Missing Years ({len(missing_years)}): {missing_years[:10]}...")
        else:
            print(f"\n✅ Complete coverage: All years 1908-2024 represented!")

        print(f"\n📊 Data Sources:")
        for source in sources:
            print(f"   {source['key']}: {source['doc_count']:,} vehicles")

        print(f"\n📊 Sample Year Distribution:")
        for bucket in years[:10]:
            print(f"   {bucket['key']}: {bucket['doc_count']} vehicles")
        if len(years) > 10:
            print(f"   ...")
            for bucket in years[-5:]:
                print(f"   {bucket['key']}: {bucket['doc_count']} vehicles")

        return len(missing_years) == 0

    except Exception as e:
        print(f"❌ Error verifying coverage: {e}")
        return False


def main():
    """Main execution"""
    print("\n" + "=" * 70)
    print("🏭 AUTOS - Historical Data Synthesis (1908-2024)")
    print("=" * 70)
    print("\nThis script will:")
    print("  1. Load historical vehicle database")
    print("  2. Generate vehicle records for every year (1908-2024)")
    print("  3. Load all records into Elasticsearch")
    print("  4. Verify complete year coverage")
    print("\n" + "=" * 70)

    # Confirm
    response = input("\n⚠️  Proceed with data synthesis? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Aborted.")
        return

    # Connect to Elasticsearch
    es = connect_to_elasticsearch()

    # Get current count
    try:
        current_count = es.count(index='autos-unified')['count']
        print(f"\n📊 Current index contains: {current_count:,} documents")
    except:
        print(f"\n⚠️  Could not get current document count")

    # Load historical database
    print(f"\n📚 Loading historical vehicle database...")
    historical_db = load_historical_database()

    manufacturers_count = len(historical_db['manufacturers'])
    total_models = sum(
        len(mfr['models'])
        for mfr in historical_db['manufacturers'].values()
    )

    print(f"✅ Loaded database:")
    print(f"   Manufacturers: {manufacturers_count}")
    print(f"   Total Models: {total_models}")

    # Generate vehicle records
    vehicles = generate_vehicle_records(historical_db)

    if len(vehicles) == 0:
        print("❌ No vehicles generated. Aborting.")
        return

    print(f"\n📋 Ready to load {len(vehicles):,} vehicle records")
    print(f"   Estimated final count: {current_count + len(vehicles):,} vehicles")

    response = input(f"\n⚠️  Proceed with loading {len(vehicles):,} vehicles? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Aborted.")
        return

    # Load to Elasticsearch
    success, failed = load_to_elasticsearch(es, vehicles)

    # Refresh index
    print(f"\n🔄 Refreshing Elasticsearch index...")
    try:
        es.indices.refresh(index='autos-unified')
        print("✅ Index refreshed")
    except Exception as e:
        print(f"⚠️  Error refreshing index: {e}")

    # Verify coverage
    complete_coverage = verify_year_coverage(es)

    # Final summary
    try:
        final_count = es.count(index='autos-unified')['count']
    except:
        final_count = current_count + success

    print("\n" + "=" * 70)
    print("📊 FINAL SUMMARY")
    print("=" * 70)
    print(f"Starting documents:    {current_count:,}")
    print(f"Generated vehicles:    {len(vehicles):,}")
    print(f"Successfully loaded:   {success:,}")
    print(f"Failed to load:        {failed:,}")
    print(f"Final document count:  {final_count:,}")
    print(f"Complete coverage:     {'✅ YES' if complete_coverage else '❌ NO'}")
    print("=" * 70)

    print(f"\n✅ Historical data synthesis complete!")
    print(f"📄 {final_count:,} total vehicles now span 1908-2024\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Synthesis interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
