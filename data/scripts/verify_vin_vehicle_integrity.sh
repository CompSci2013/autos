#!/bin/bash
# Verify VIN-Vehicle Data Integrity
# Checks for orphaned VINs (VINs with no corresponding vehicle)

ES_HOST="http://localhost:30398"

echo "=========================================="
echo "VIN-Vehicle Data Integrity Check"
echo "=========================================="
echo

# 1. Count total VINs
echo "1. Counting VINs..."
VIN_COUNT=$(curl -s "${ES_HOST}/autos-vins/_count" | jq -r '.count')
echo "   Total VINs: ${VIN_COUNT}"
echo

# 2. Count total vehicles
echo "2. Counting vehicles..."
VEHICLE_COUNT=$(curl -s "${ES_HOST}/autos-unified/_count" | jq -r '.count')
echo "   Total vehicles: ${VEHICLE_COUNT}"
echo

# 3. Get all unique vehicle_ids from autos-vins
echo "3. Extracting unique vehicle_ids from VINs..."
curl -s -X POST "${ES_HOST}/autos-vins/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "aggs": {
      "unique_vehicle_ids": {
        "terms": {
          "field": "vehicle_id",
          "size": 10000
        }
      }
    }
  }' | jq -r '.aggregations.unique_vehicle_ids.buckets[] | "\(.key) \(.doc_count)"' > /tmp/vin_vehicle_ids.txt

UNIQUE_VIN_VEHICLE_IDS=$(wc -l < /tmp/vin_vehicle_ids.txt)
echo "   Unique vehicle_ids referenced by VINs: ${UNIQUE_VIN_VEHICLE_IDS}"
echo

# 4. Get all vehicle_ids from autos-unified
echo "4. Extracting vehicle_ids from vehicles..."
curl -s -X POST "${ES_HOST}/autos-unified/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 10000,
    "_source": ["vehicle_id"]
  }' | jq -r '.hits.hits[]._source.vehicle_id' | sort > /tmp/actual_vehicle_ids.txt

ACTUAL_VEHICLE_IDS=$(wc -l < /tmp/actual_vehicle_ids.txt)
echo "   Actual vehicle_ids in vehicles index: ${ACTUAL_VEHICLE_IDS}"
echo

# 5. Find orphaned VINs (VINs with vehicle_ids not in autos-unified)
echo "5. Finding orphaned VINs (VINs referencing non-existent vehicles)..."
cut -d' ' -f1 /tmp/vin_vehicle_ids.txt | sort > /tmp/vin_vehicle_ids_only.txt
comm -23 /tmp/vin_vehicle_ids_only.txt /tmp/actual_vehicle_ids.txt > /tmp/orphaned_vehicle_ids.txt

ORPHANED_COUNT=$(wc -l < /tmp/orphaned_vehicle_ids.txt)
echo "   Orphaned vehicle_ids (VINs with no vehicle): ${ORPHANED_COUNT}"
echo

if [ ${ORPHANED_COUNT} -gt 0 ]; then
    echo "   Sample orphaned vehicle_ids (first 10):"
    head -10 /tmp/orphaned_vehicle_ids.txt | while read vid; do
        VIN_COUNT=$(grep "^${vid} " /tmp/vin_vehicle_ids.txt | cut -d' ' -f2)
        echo "      ${vid} (${VIN_COUNT} VINs)"
    done
    echo
fi

# 6. Find vehicles with no VINs
echo "6. Finding vehicles with no corresponding VINs..."
comm -13 /tmp/vin_vehicle_ids_only.txt /tmp/actual_vehicle_ids.txt > /tmp/vehicles_no_vins.txt

NO_VINS_COUNT=$(wc -l < /tmp/vehicles_no_vins.txt)
echo "   Vehicles with no VINs: ${NO_VINS_COUNT}"
echo

if [ ${NO_VINS_COUNT} -gt 0 ]; then
    echo "   Sample vehicle_ids with no VINs (first 10):"
    head -10 /tmp/vehicles_no_vins.txt
    echo
fi

# Summary
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "Total VINs:                    ${VIN_COUNT}"
echo "Total Vehicles:                ${VEHICLE_COUNT}"
echo "Unique vehicle_ids in VINs:    ${UNIQUE_VIN_VEHICLE_IDS}"
echo "Orphaned VINs (no vehicle):    ${ORPHANED_COUNT}"
echo "Vehicles with no VINs:         ${NO_VINS_COUNT}"
echo

# Recommendations
if [ ${ORPHANED_COUNT} -gt 0 ]; then
    echo "⚠️  DATA INTEGRITY ISSUE DETECTED!"
    echo
    echo "RECOMMENDED ACTIONS:"
    echo "1. Delete orphaned VINs: ./delete_orphaned_vins.sh"
    echo "2. Re-generate VINs for vehicles: python generate_vins_for_vehicles.py"
    echo
fi

if [ ${NO_VINS_COUNT} -gt 0 ]; then
    echo "ℹ️  Some vehicles have no VINs (this is expected if VINs not generated yet)"
    echo
fi

echo "Temporary files created:"
echo "  /tmp/vin_vehicle_ids.txt       - VIN vehicle_ids with counts"
echo "  /tmp/actual_vehicle_ids.txt    - Actual vehicle IDs"
echo "  /tmp/orphaned_vehicle_ids.txt  - Orphaned vehicle IDs"
echo "  /tmp/vehicles_no_vins.txt      - Vehicles without VINs"
echo
