#!/bin/bash
# Delete Orphaned VINs
# Removes VINs that reference vehicle_ids not present in autos-unified

ES_HOST="http://localhost:30398"

echo "=========================================="
echo "Delete Orphaned VINs"
echo "=========================================="
echo

# Check if orphaned_vehicle_ids.txt exists
if [ ! -f /tmp/orphaned_vehicle_ids.txt ]; then
    echo "❌ Error: /tmp/orphaned_vehicle_ids.txt not found"
    echo "   Run ./verify_vin_vehicle_integrity.sh first"
    exit 1
fi

ORPHANED_COUNT=$(wc -l < /tmp/orphaned_vehicle_ids.txt)

if [ ${ORPHANED_COUNT} -eq 0 ]; then
    echo "✅ No orphaned VINs found. Nothing to delete."
    exit 0
fi

echo "Found ${ORPHANED_COUNT} orphaned vehicle_ids"
echo

# Show sample
echo "Sample orphaned vehicle_ids (first 10):"
head -10 /tmp/orphaned_vehicle_ids.txt
echo

# Confirm deletion
read -p "Delete all VINs for these ${ORPHANED_COUNT} orphaned vehicle_ids? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo
echo "Deleting orphaned VINs..."
DELETED_COUNT=0

while read vehicle_id; do
    # Delete VINs with this vehicle_id
    RESULT=$(curl -s -X POST "${ES_HOST}/autos-vins/_delete_by_query" \
      -H 'Content-Type: application/json' \
      -d "{
        \"query\": {
          \"term\": {
            \"vehicle_id\": \"${vehicle_id}\"
          }
        }
      }")

    DELETED=$(echo ${RESULT} | jq -r '.deleted')
    DELETED_COUNT=$((DELETED_COUNT + DELETED))

    echo "  Deleted ${DELETED} VINs for vehicle_id: ${vehicle_id}"
done < /tmp/orphaned_vehicle_ids.txt

echo
echo "=========================================="
echo "✅ Deletion complete!"
echo "   Total VINs deleted: ${DELETED_COUNT}"
echo "=========================================="
echo

# Refresh index
echo "Refreshing index..."
curl -s -X POST "${ES_HOST}/autos-vins/_refresh" > /dev/null

# Show new counts
NEW_VIN_COUNT=$(curl -s "${ES_HOST}/autos-vins/_count" | jq -r '.count')
echo "New VIN count: ${NEW_VIN_COUNT}"
echo

echo "Run ./verify_vin_vehicle_integrity.sh to verify integrity"
