#!/usr/bin/env python3
"""
Generate VINs for Vehicles Without VINs

Reads vehicles from autos-unified that have no corresponding VINs in autos-vins
and generates synthetic VINs for them.
"""

import json
import random
from datetime import datetime
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

ES_HOST = 'http://10.43.133.216:9200'
VINS_INDEX = 'autos-vins'
VEHICLES_INDEX = 'autos-unified'

# US States with population weights (for realistic distribution)
STATES = [
    ('CA', 15), ('TX', 8), ('FL', 7), ('NY', 6), ('PA', 5),
    ('IL', 5), ('OH', 4), ('GA', 4), ('NC', 4), ('MI', 4),
    ('NJ', 3), ('VA', 3), ('WA', 3), ('AZ', 3), ('MA', 3),
    ('TN', 3), ('IN', 3), ('MO', 2), ('MD', 2), ('WI', 2),
    ('CO', 2), ('MN', 2), ('SC', 2), ('AL', 2), ('LA', 2),
    ('KY', 2), ('OR', 2), ('OK', 2), ('CT', 1), ('UT', 1),
    ('IA', 1), ('NV', 1), ('AR', 1), ('MS', 1), ('KS', 1),
    ('NM', 1), ('NE', 1), ('WV', 1), ('ID', 1), ('HI', 1),
    ('NH', 1), ('ME', 1), ('RI', 1), ('MT', 1), ('DE', 1),
    ('SD', 1), ('ND', 1), ('AK', 1), ('VT', 1), ('WY', 1)
]

# Body class specific condition distributions
CONDITION_DISTRIBUTIONS = {
    'Sedan': {'Excellent': 0.2, 'Good': 0.5, 'Fair': 0.25, 'Poor': 0.05},
    'Coupe': {'Excellent': 0.25, 'Good': 0.45, 'Fair': 0.25, 'Poor': 0.05},
    'Convertible': {'Excellent': 0.3, 'Good': 0.4, 'Fair': 0.25, 'Poor': 0.05},
    'Pickup': {'Excellent': 0.15, 'Good': 0.45, 'Fair': 0.3, 'Poor': 0.1},
    'SUV': {'Excellent': 0.2, 'Good': 0.5, 'Fair': 0.25, 'Poor': 0.05},
    'Van': {'Excellent': 0.1, 'Good': 0.4, 'Fair': 0.35, 'Poor': 0.15},
    'Wagon': {'Excellent': 0.25, 'Good': 0.45, 'Fair': 0.25, 'Poor': 0.05}
}

DEFAULT_CONDITION_DIST = {'Excellent': 0.2, 'Good': 0.5, 'Fair': 0.25, 'Poor': 0.05}

# Title statuses
TITLE_STATUSES = [
    ('Clean', 0.75),
    ('Salvage', 0.08),
    ('Rebuilt', 0.06),
    ('Flood', 0.03),
    ('Theft Recovery', 0.03),
    ('Lemon', 0.02),
    ('Junk', 0.03)
]

# Colors (period-appropriate will be handled separately)
MODERN_COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Tan', 'Beige']
CLASSIC_COLORS = ['White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Cream', 'Tan', 'Turquoise', 'Pink']


def weighted_choice(choices):
    """Choose item from weighted list of (value, weight) tuples"""
    total = sum(w for c, w in choices)
    r = random.uniform(0, total)
    upto = 0
    for c, w in choices:
        if upto + w >= r:
            return c
        upto += w
    return choices[-1][0]  # Fallback


def generate_vin(manufacturer, year):
    """Generate a synthetic but realistic-looking VIN"""
    # WMI (World Manufacturer Identifier) - First 3 chars
    wmi_map = {
        'Ford': '1FA', 'Lincoln': '1LN', 'Mercury': '1ME',
        'Chevrolet': '1GC', 'Buick': '1G4', 'Cadillac': '1GY',
        'Pontiac': '1G2', 'Oldsmobile': '1G3', 'GMC': '1GT',
        'Dodge': '1B3', 'Chrysler': '1C3', 'Plymouth': '1P3',
        'Jeep': '1J4', 'Ram': '1D7',
        'Tesla': '5YJ', 'Rivian': '7JR',
    }
    wmi = wmi_map.get(manufacturer, '1XX')

    # VDS (Vehicle Descriptor Section) - 6 chars (random)
    vds = ''.join(random.choices('ABCDEFGHJKLMNPRSTUVWXYZ0123456789', k=6))

    # Check digit (just use a random digit for synthetic data)
    check = str(random.randint(0, 9))

    # Model year code (10th position)
    year_codes = {
        1950: 'A', 1951: 'B', 1952: 'C', 1953: 'D', 1954: 'E',
        1955: 'F', 1956: 'G', 1957: 'H', 1958: 'J', 1959: 'K',
        1960: 'L', 1961: 'M', 1962: 'N', 1963: 'P', 1964: 'R',
        1965: 'S', 1966: 'T', 1967: 'V', 1968: 'W', 1969: 'X',
        1970: 'Y', 1971: '1', 1972: '2', 1973: '3', 1974: '4',
        1975: '5', 1976: '6', 1977: '7', 1978: '8', 1979: '9',
        1980: 'A', 1981: 'B', 1982: 'C', 1983: 'D', 1984: 'E',
        1985: 'F', 1986: 'G', 1987: 'H', 1988: 'J', 1989: 'K',
        1990: 'L', 1991: 'M', 1992: 'N', 1993: 'P', 1994: 'R',
        1995: 'S', 1996: 'T', 1997: 'V', 1998: 'W', 1999: 'X',
        2000: 'Y', 2001: '1', 2002: '2', 2003: '3', 2004: '4',
        2005: '5', 2006: '6', 2007: '7', 2008: '8', 2009: '9',
        2010: 'A', 2011: 'B', 2012: 'C', 2013: 'D', 2014: 'E',
        2015: 'F', 2016: 'G', 2017: 'H', 2018: 'J', 2019: 'K',
        2020: 'L', 2021: 'M', 2022: 'N', 2023: 'P', 2024: 'R',
        2025: 'S'
    }
    year_code = year_codes.get(year, 'X')

    # Plant code (11th position) - random letter
    plant = random.choice('ABCDEFGHJKLMNPRSTUVWXYZ')

    # Sequential number (last 6 digits)
    sequential = f"{random.randint(100000, 999999)}"

    return f"{wmi}{vds}{check}{year_code}{plant}{sequential}"


def generate_vin_instance(vehicle, vin_number):
    """Generate a single VIN instance with synthetic attributes"""
    manufacturer = vehicle['manufacturer']
    model = vehicle['model']
    year = vehicle['year']
    body_class = vehicle.get('body_class', 'Sedan')
    vehicle_id = vehicle['vehicle_id']

    # Generate VIN
    vin = generate_vin(manufacturer, year)

    # State (weighted distribution)
    state = weighted_choice(STATES)

    # Condition based on body class
    condition_dist = CONDITION_DISTRIBUTIONS.get(body_class, DEFAULT_CONDITION_DIST)
    condition_choices = [(k, v) for k, v in condition_dist.items()]
    condition = weighted_choice(condition_choices)

    # Condition rating (1-10)
    condition_rating_map = {
        'Excellent': random.randint(9, 10),
        'Good': random.randint(7, 8),
        'Fair': random.randint(4, 6),
        'Poor': random.randint(1, 3)
    }
    condition_rating = condition_rating_map[condition]

    # Mileage (based on year and condition)
    current_year = datetime.now().year
    age = current_year - year
    avg_miles_per_year = {
        'Excellent': 8000,
        'Good': 12000,
        'Fair': 15000,
        'Poor': 18000
    }[condition]

    base_mileage = age * avg_miles_per_year
    mileage = int(base_mileage * random.uniform(0.7, 1.3))
    mileage = max(100, mileage)  # Minimum 100 miles

    # Title status
    title_status = weighted_choice(TITLE_STATUSES)

    # Color (period-appropriate)
    colors = CLASSIC_COLORS if year < 1970 else MODERN_COLORS
    exterior_color = random.choice(colors)

    # Estimated value (based on condition, mileage, age)
    base_value_map = {
        'Excellent': 35000,
        'Good': 25000,
        'Fair': 15000,
        'Poor': 8000
    }
    base_value = base_value_map[condition]

    # Adjust for age (classic cars appreciate, modern depreciate)
    if year < 1980:
        # Classic car - value increases with age
        age_factor = 1 + (current_year - year) * 0.02
    else:
        # Modern car - value decreases with age
        age_factor = max(0.2, 1 - (current_year - year) * 0.05)

    # Adjust for mileage
    mileage_factor = max(0.5, 1 - (mileage / 200000) * 0.3)

    estimated_value = int(base_value * age_factor * mileage_factor * random.uniform(0.9, 1.1))
    estimated_value = max(1000, estimated_value)

    # Other attributes
    matching_numbers = random.random() < 0.3  # 30% chance
    mileage_verified = random.random() < 0.6  # 60% chance
    registration_status = random.choice(['Current', 'Expired', 'Pending'])

    return {
        'vin': vin,
        'vehicle_id': vehicle_id,
        'manufacturer': manufacturer,
        'model': model,
        'year': year,
        'body_class': body_class,
        'registered_state': state,
        'mileage': mileage,
        'mileage_verified': mileage_verified,
        'exterior_color': exterior_color,
        'condition_description': condition,
        'condition_rating': condition_rating,
        'title_status': title_status,
        'estimated_value': estimated_value,
        'matching_numbers': matching_numbers,
        'registration_status': registration_status,
        'data_source': vehicle.get('data_source', 'NHTSA')
    }


def main():
    print("=" * 70)
    print("Generate VINs for Vehicles Without VINs")
    print("=" * 70)
    print()

    # Connect to Elasticsearch
    print(f"Connecting to Elasticsearch: {ES_HOST}")
    es = Elasticsearch([ES_HOST])

    # Read vehicles without VINs from file
    if not os.path.exists('/tmp/vehicles_no_vins.txt'):
        print("❌ Error: /tmp/vehicles_no_vins.txt not found")
        print("   Run ./verify_vin_vehicle_integrity.sh first")
        return

    with open('/tmp/vehicles_no_vins.txt', 'r') as f:
        vehicle_ids_no_vins = [line.strip() for line in f if line.strip()]

    print(f"Found {len(vehicle_ids_no_vins)} vehicles without VINs")

    if len(vehicle_ids_no_vins) == 0:
        print("✅ All vehicles have VINs!")
        return

    # Fetch vehicle details
    print("\nFetching vehicle details...")
    vehicles = []
    for vid in vehicle_ids_no_vins:
        result = es.search(index=VEHICLES_INDEX, body={
            'query': {'term': {'vehicle_id': vid}},
            'size': 1
        })

        if result['hits']['total']['value'] > 0:
            vehicles.append(result['hits']['hits'][0]['_source'])

    print(f"Loaded {len(vehicles)} vehicle records")

    # Ask how many VINs per vehicle
    print("\nHow many VINs to generate per vehicle?")
    vins_per_vehicle = int(input("  (Suggested: 5-20): "))

    total_vins = len(vehicles) * vins_per_vehicle
    print(f"\nWill generate {total_vins} total VINs ({len(vehicles)} vehicles × {vins_per_vehicle} VINs)")

    confirm = input("Continue? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Aborted.")
        return

    # Generate VINs
    print("\nGenerating VINs...")
    actions = []
    for vehicle in vehicles:
        for i in range(vins_per_vehicle):
            vin_instance = generate_vin_instance(vehicle, i + 1)

            action = {
                "_index": VINS_INDEX,
                "_id": vin_instance['vin'],
                "_source": vin_instance
            }
            actions.append(action)

    # Bulk index
    print(f"\nBulk indexing {len(actions)} VINs...")
    success, failed = bulk(es, actions, raise_on_error=False, stats_only=False)

    print(f"\n✅ Bulk indexing complete!")
    print(f"   Success: {success}")
    print(f"   Failed: {len(failed) if isinstance(failed, list) else 0}")

    # Refresh index
    es.indices.refresh(index=VINS_INDEX)

    # Verify count
    count = es.count(index=VINS_INDEX)['count']
    print(f"\n📊 Index '{VINS_INDEX}' now contains {count} VINs")

    print("\nRun ./verify_vin_vehicle_integrity.sh to verify integrity")


if __name__ == '__main__':
    import os
    main()
