#!/usr/bin/env python3
"""
VIN Data Generator - Creates 15,000 VIN records for Elasticsearch

Ports the Node.js VINGenerator logic to Python and adds fields:
- manufacturer
- model
- year
- body_class
- vehicle_id (for linking back to vehicle specs)

Distribution strategy:
- Query all vehicles from autos-unified index
- Distribute 15K VINs proportionally based on instance_count
- Generate deterministic VINs using vehicle_id as seed
"""

import json
import math
import random
from datetime import datetime, timedelta
from elasticsearch import Elasticsearch

# Elasticsearch connection
ES_HOST = 'http://10.43.133.216:9200'
ES_INDEX = 'autos-unified'
TARGET_VIN_COUNT = 15000


class VINGenerator:
    """Python port of Node.js VINGenerator"""

    def __init__(self, seed):
        self.seed = seed
        self.state = seed

    def _seeded_random(self):
        """Seeded random number generator (LCG algorithm)"""
        self.state = (self.state * 1664525 + 1013904223) % 4294967296
        return self.state / 4294967296

    @staticmethod
    def hash_string(s):
        """Generate hash from string for seed"""
        hash_val = 0
        for char in s:
            hash_val = ((hash_val << 5) - hash_val) + ord(char)
            hash_val = hash_val & 0xFFFFFFFF  # Keep as 32-bit
        return abs(hash_val)

    def generate_pre_1981_vin(self, manufacturer, year, index):
        """Generate pre-1981 VIN (manufacturer-specific format)"""
        year_code = str(year)[-1]
        plants = ['R', 'F', 'T', 'D', 'A']
        plant = plants[int(self._seeded_random() * len(plants))]
        serial = str(100000 + index).zfill(6)

        # Ford format: 7R01C123456
        return f"{year_code}{plant}01C{serial}"

    def generate_post_1981_vin(self, manufacturer, year, index):
        """Generate post-1981 VIN (ISO standard 17 chars)"""
        country = '1'  # USA
        mfr_code = manufacturer[:2].upper()
        year_codes = 'ABCDEFGHJKLMNPRSTVWXY123456789'
        year_index = (year - 1980) % len(year_codes)
        year_code = year_codes[year_index]
        plant = 'F'
        serial = str(100000 + index).zfill(6)

        return f"{country}{mfr_code}BP40E9{year_code}{plant}{serial}"

    def generate_mileage(self, year):
        """Generate realistic mileage based on age"""
        age = 2025 - year
        avg_miles_per_year = 5000 + (self._seeded_random() * 7000)
        base_mileage = age * avg_miles_per_year

        # Distribution: 20% low, 50% medium, 25% high, 5% very high
        roll = self._seeded_random()
        if roll < 0.20:
            return int(base_mileage * 0.3)
        elif roll < 0.70:
            return int(base_mileage * 0.8)
        elif roll < 0.95:
            return int(base_mileage * 1.5)
        else:
            return int(base_mileage * 2.5)

    def generate_condition(self):
        """Generate condition rating with realistic distribution"""
        roll = self._seeded_random()
        if roll < 0.05:
            return {'rating': 5, 'description': 'Concours'}
        elif roll < 0.20:
            return {'rating': 4, 'description': 'Excellent'}
        elif roll < 0.55:
            return {'rating': 3, 'description': 'Good'}
        elif roll < 0.85:
            return {'rating': 2, 'description': 'Fair'}
        else:
            return {'rating': 1, 'description': 'Project'}

    def generate_state(self):
        """Generate registered state with geographic weighting"""
        states = [
            {'code': 'CA', 'weight': 15},
            {'code': 'TX', 'weight': 8},
            {'code': 'FL', 'weight': 7},
            {'code': 'AZ', 'weight': 5},
            {'code': 'OH', 'weight': 4},
            {'code': 'MI', 'weight': 4},
            {'code': 'NY', 'weight': 3},
            {'code': 'PA', 'weight': 3}
        ]

        total_weight = sum(s['weight'] for s in states)
        roll = self._seeded_random() * total_weight

        for state in states:
            roll -= state['weight']
            if roll <= 0:
                return state['code']

        return 'CA'

    def generate_color(self, year):
        """Generate exterior color (period-appropriate)"""
        pre_1970_colors = [
            'Wimbledon White', 'Candy Apple Red', 'Springtime Yellow',
            'Arcadian Blue', 'Ivy Gold', 'Silver Smoke Gray'
        ]
        post_1970_colors = [
            'Bright Red', 'Black', 'White', 'Silver Metallic',
            'Dark Blue Metallic', 'Green Metallic'
        ]

        colors = pre_1970_colors if year < 1970 else post_1970_colors
        return colors[int(self._seeded_random() * len(colors))]

    def generate_options(self, condition_rating):
        """Generate factory options"""
        all_options = [
            'Power Steering',
            'Power Disc Brakes',
            'Air Conditioning',
            'GT Equipment Group',
            'Interior Decor Group',
            'Rally Pac Gauges',
            'AM/FM Radio',
            'Tinted Glass'
        ]

        # Better condition = more original options preserved
        option_count = int(condition_rating * self._seeded_random() * 3)
        selected_options = []

        for _ in range(min(option_count, len(all_options))):
            option = all_options[int(self._seeded_random() * len(all_options))]
            if option not in selected_options:
                selected_options.append(option)

        return selected_options

    def calculate_value(self, condition_rating, mileage, options):
        """Calculate value based on condition, mileage, options"""
        base_values = {
            5: 100000,
            4: 65000,
            3: 40000,
            2: 25000,
            1: 15000
        }

        value = base_values[condition_rating]

        # Mileage adjustment
        if mileage < 50000:
            value *= 1.2
        elif mileage > 150000:
            value *= 0.8

        # Options bonus
        value += len(options) * 2000

        # Random variance ±10%
        value *= (0.9 + (self._seeded_random() * 0.2))

        return int(value)

    def generate_instance(self, vehicle_data, index):
        """Generate single VIN instance with manufacturer/model/year/body_class"""
        manufacturer = vehicle_data['manufacturer']
        model = vehicle_data['model']
        year = vehicle_data['year']
        body_class = vehicle_data['body_class']
        vehicle_id = vehicle_data['vehicle_id']

        # Generate VIN
        vin = (self.generate_pre_1981_vin(manufacturer, year, index)
               if year <= 1980
               else self.generate_post_1981_vin(manufacturer, year, index))

        # Generate correlated attributes
        condition = self.generate_condition()
        mileage = self.generate_mileage(year)
        state = self.generate_state()
        color = self.generate_color(year)
        options = self.generate_options(condition['rating'])
        value = self.calculate_value(condition['rating'], mileage, options)

        # Random date within last 6 months
        days_ago = int(self._seeded_random() * 180)
        last_service = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')

        return {
            'vin': vin,
            'manufacturer': manufacturer,  # NEW FIELD
            'model': model,                # NEW FIELD
            'year': year,                  # NEW FIELD
            'body_class': body_class,      # NEW FIELD
            'vehicle_id': vehicle_id,      # Link to vehicle spec
            'condition_rating': condition['rating'],
            'condition_description': condition['description'],
            'mileage': mileage,
            'mileage_verified': self._seeded_random() > 0.2,
            'registered_state': state,
            'registration_status': 'Active' if self._seeded_random() > 0.55 else 'Historic',
            'title_status': 'Clean' if self._seeded_random() > 0.1 else 'Rebuilt',
            'exterior_color': color,
            'factory_options': options,
            'estimated_value': value,
            'matching_numbers': self._seeded_random() > 0.4,
            'last_service_date': last_service
        }


def fetch_vehicles_from_elasticsearch():
    """Fetch all vehicles from autos-unified index"""
    print(f"Connecting to Elasticsearch: {ES_HOST}")
    es = Elasticsearch([ES_HOST])

    print(f"Fetching vehicles from index: {ES_INDEX}")

    # Scroll through all documents
    vehicles = []
    page = es.search(
        index=ES_INDEX,
        scroll='2m',
        size=1000,
        body={'query': {'match_all': {}}}
    )

    scroll_id = page['_scroll_id']
    scroll_size = len(page['hits']['hits'])

    while scroll_size > 0:
        for hit in page['hits']['hits']:
            source = hit['_source']
            vehicles.append({
                'vehicle_id': source.get('vehicle_id'),
                'manufacturer': source.get('manufacturer'),
                'model': source.get('model'),
                'year': source.get('year'),
                'body_class': source.get('body_class', 'Unknown'),
                'instance_count': source.get('instance_count', 1)
            })

        page = es.scroll(scroll_id=scroll_id, scroll='2m')
        scroll_id = page['_scroll_id']
        scroll_size = len(page['hits']['hits'])

    print(f"Fetched {len(vehicles)} vehicles from Elasticsearch")
    return vehicles


def distribute_vins_across_vehicles(vehicles, target_count):
    """
    Distribute target VIN count across vehicles proportionally
    based on instance_count with minimum 5 VINs per vehicle
    """
    total_instances = sum(v['instance_count'] for v in vehicles)
    min_vins_per_vehicle = 5

    # Calculate proportional distribution
    distribution = []
    for vehicle in vehicles:
        proportion = vehicle['instance_count'] / total_instances
        allocated_vins = max(min_vins_per_vehicle, int(target_count * proportion))
        distribution.append({
            'vehicle': vehicle,
            'vin_count': allocated_vins
        })

    # Adjust to hit exact target
    current_total = sum(d['vin_count'] for d in distribution)
    if current_total != target_count:
        # Sort by instance_count and adjust the largest vehicles
        distribution.sort(key=lambda d: d['vehicle']['instance_count'], reverse=True)
        diff = target_count - current_total

        if diff > 0:
            # Add VINs to largest vehicles
            for i in range(diff):
                distribution[i % len(distribution)]['vin_count'] += 1
        else:
            # Remove VINs from largest vehicles (only if > min)
            for i in range(abs(diff)):
                if distribution[i % len(distribution)]['vin_count'] > min_vins_per_vehicle:
                    distribution[i % len(distribution)]['vin_count'] -= 1

    return distribution


def generate_all_vins(distribution):
    """Generate VINs for all vehicles"""
    all_vins = []
    total_vehicles = len(distribution)

    print(f"\nGenerating VINs for {total_vehicles} vehicles...")

    for idx, item in enumerate(distribution):
        vehicle = item['vehicle']
        vin_count = item['vin_count']

        # Create generator with deterministic seed
        seed = VINGenerator.hash_string(vehicle['vehicle_id'])
        generator = VINGenerator(seed)

        # Generate VINs
        for i in range(vin_count):
            vin_instance = generator.generate_instance(vehicle, i)
            all_vins.append(vin_instance)

        if (idx + 1) % 100 == 0:
            print(f"  Progress: {idx + 1}/{total_vehicles} vehicles processed ({len(all_vins)} VINs)")

    print(f"\nGenerated {len(all_vins)} total VINs")
    return all_vins


def save_vins_to_json(vins, output_file='vin_data_15k.json'):
    """Save VIN data to JSON file"""
    print(f"\nSaving VINs to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(vins, f, indent=2)
    print(f"Saved {len(vins)} VINs to {output_file}")


def main():
    print("=" * 60)
    print("VIN Data Generator - Creating 15,000 VIN Records")
    print("=" * 60)

    # Step 1: Fetch vehicles
    vehicles = fetch_vehicles_from_elasticsearch()

    # Step 2: Distribute VINs
    print(f"\nDistributing {TARGET_VIN_COUNT} VINs across {len(vehicles)} vehicles...")
    distribution = distribute_vins_across_vehicles(vehicles, TARGET_VIN_COUNT)

    # Show distribution stats
    vin_counts = [d['vin_count'] for d in distribution]
    print(f"  Min VINs per vehicle: {min(vin_counts)}")
    print(f"  Max VINs per vehicle: {max(vin_counts)}")
    print(f"  Avg VINs per vehicle: {sum(vin_counts) / len(vin_counts):.1f}")

    # Step 3: Generate VINs
    all_vins = generate_all_vins(distribution)

    # Step 4: Save to JSON
    save_vins_to_json(all_vins)

    print("\n" + "=" * 60)
    print("VIN generation complete!")
    print("=" * 60)
    print(f"\nNext steps:")
    print("1. Create Elasticsearch index: python create_vins_index.py")
    print("2. Load VIN data: python load_vin_data.py")
    print("3. Update backend API to query VINs from Elasticsearch")


if __name__ == '__main__':
    main()
