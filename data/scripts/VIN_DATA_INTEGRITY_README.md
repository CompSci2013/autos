# VIN-Vehicle Data Integrity Tools

## Problem Statement

The AUTOS application has two Elasticsearch indices:
- **autos-unified**: ~4,887 vehicle records (unique make/model/year combinations)
- **autos-vins**: ~1,835 VIN records (individual VIN instances)

**Expected relationship**: Every vehicle should have 1+ VINs, and every VIN should reference an existing vehicle.

**Observed discrepancy**: More vehicles than VINs suggests one of two issues:
1. **Orphaned VINs** - VINs with `vehicle_id` values that don't exist in autos-unified
2. **Vehicles without VINs** - Vehicles that have no corresponding VIN records

## Verification

### Step 1: Run Integrity Check

```bash
cd /home/odin/projects/autos/data/scripts
./verify_vin_vehicle_integrity.sh
```

This script will:
1. Count total VINs and vehicles
2. Extract all unique `vehicle_id` values from VINs
3. Extract all actual `vehicle_id` values from vehicles
4. Identify orphaned VINs (VINs referencing non-existent vehicles)
5. Identify vehicles with no VINs
6. Generate temporary files for remediation

**Output files** (in `/tmp`):
- `vin_vehicle_ids.txt` - Unique vehicle_ids from VINs with VIN counts
- `actual_vehicle_ids.txt` - All vehicle_ids from autos-unified
- `orphaned_vehicle_ids.txt` - vehicle_ids that exist in VINs but not in vehicles
- `vehicles_no_vins.txt` - vehicle_ids that have no VINs

### Step 2: Analyze Results

**Example output:**
```
SUMMARY
==========================================
Total VINs:                    1,835
Total Vehicles:                4,887
Unique vehicle_ids in VINs:    367
Orphaned VINs (no vehicle):    0
Vehicles with no VINs:         4,520
```

**Interpretation:**
- If `Orphaned VINs > 0`: VINs reference deleted/non-existent vehicles → DELETE orphaned VINs
- If `Vehicles with no VINs > 0`: Vehicles exist but have no VINs → GENERATE VINs

## Remediation

### Option A: Delete Orphaned VINs

**When**: VINs reference vehicle_ids that don't exist in autos-unified

**How**:
```bash
./delete_orphaned_vins.sh
```

This script will:
1. Read orphaned vehicle_ids from `/tmp/orphaned_vehicle_ids.txt`
2. Show sample orphaned vehicle_ids
3. Prompt for confirmation
4. Delete all VINs matching orphaned vehicle_ids
5. Refresh the autos-vins index

**Use case**: Data was loaded incorrectly, or vehicles were deleted but VINs weren't

---

### Option B: Generate VINs for Vehicles

**When**: Vehicles exist but have no corresponding VINs

**How**:
```bash
python3 generate_vins_for_vehicles.py
```

This script will:
1. Read vehicle_ids from `/tmp/vehicles_no_vins.txt`
2. Fetch full vehicle details from autos-unified
3. Prompt for how many VINs per vehicle (suggested: 5-20)
4. Generate synthetic VIN instances with:
   - Realistic VIN structure (WMI, VDS, check digit, year code)
   - Geographic distribution (weighted by state population)
   - Condition ratings (Excellent, Good, Fair, Poor)
   - Period-appropriate attributes (colors, mileage, value)
   - Title statuses (Clean, Salvage, Rebuilt, etc.)
5. Bulk index VINs into autos-vins

**VIN Generation Logic**:
- **VIN Format**: `[WMI][VDS][Check][Year][Plant][Sequential]`
  - WMI: Manufacturer-specific (e.g., `1FA` for Ford)
  - Year: Encoded letter/digit for model year
  - Sequential: Random 6-digit number
- **Attributes**:
  - State: Weighted by US population (CA 15%, TX 8%, etc.)
  - Mileage: Age × avg_miles_per_year × random(0.7-1.3)
  - Condition: Body-class specific distribution
  - Value: Calculated from condition, age, mileage
  - Classic cars (pre-1980) appreciate, modern cars depreciate

**Use case**: Initial VIN generation, or adding VINs for newly added vehicles

---

## Complete Workflow

### Scenario 1: Initial Setup (No VINs Generated Yet)

```bash
# 1. Verify current state
./verify_vin_vehicle_integrity.sh

# Expected output:
#   Vehicles with no VINs: 4,887 (all vehicles)

# 2. Generate VINs
python3 generate_vins_for_vehicles.py
# Enter: 10 (VINs per vehicle)

# Result: 48,870 VINs created (4,887 vehicles × 10 VINs)

# 3. Re-verify
./verify_vin_vehicle_integrity.sh

# Expected output:
#   Vehicles with no VINs: 0
```

---

### Scenario 2: Data Corruption (Orphaned VINs)

```bash
# 1. Verify current state
./verify_vin_vehicle_integrity.sh

# Output shows:
#   Orphaned VINs (no vehicle): 1,835

# 2. Delete orphaned VINs
./delete_orphaned_vins.sh

# 3. Generate VINs for all vehicles
python3 generate_vins_for_vehicles.py

# 4. Re-verify
./verify_vin_vehicle_integrity.sh
```

---

### Scenario 3: Partial VIN Coverage

```bash
# 1. Verify current state
./verify_vin_vehicle_integrity.sh

# Output shows:
#   Vehicles with no VINs: 4,520
#   (367 vehicles already have VINs)

# 2. Generate VINs only for vehicles without VINs
python3 generate_vins_for_vehicles.py

# 3. Re-verify
./verify_vin_vehicle_integrity.sh
```

---

## Expected Final State

After remediation:

```
SUMMARY
==========================================
Total VINs:                    48,870
Total Vehicles:                4,887
Unique vehicle_ids in VINs:    4,887
Orphaned VINs (no vehicle):    0
Vehicles with no VINs:         0
```

**Data integrity achieved:**
- ✅ Every vehicle has VINs
- ✅ Every VIN references an existing vehicle
- ✅ No orphaned data

---

## Technical Notes

### Elasticsearch Indices

**autos-unified** (Vehicles):
```json
{
  "vehicle_id": "unique-hash",
  "manufacturer": "Ford",
  "model": "F-150",
  "year": 2020,
  "body_class": "Pickup",
  "data_source": "NHTSA",
  "make_model_year": "Ford|F-150|2020"
}
```

**autos-vins** (VINs):
```json
{
  "vin": "1FTFW1E88BFC12345",
  "vehicle_id": "unique-hash",
  "manufacturer": "Ford",
  "model": "F-150",
  "year": 2020,
  "mileage": 45000,
  "condition_rating": 8,
  "estimated_value": 35000,
  ...
}
```

**Key relationship**: `autos-vins.vehicle_id` → `autos-unified.vehicle_id` (many-to-one)

---

## Troubleshooting

### Issue: Scripts fail with "command not found"

```bash
# Make scripts executable
chmod +x verify_vin_vehicle_integrity.sh
chmod +x delete_orphaned_vins.sh
chmod +x generate_vins_for_vehicles.py
```

### Issue: Elasticsearch connection refused

```bash
# Check Elasticsearch is running
kubectl get pods -n data

# Check service endpoint
kubectl get svc -n data elasticsearch

# Update ES_HOST in scripts if needed
```

### Issue: jq command not found

```bash
# Install jq on Thor
sudo apt-get install jq
```

### Issue: Python script missing dependencies

```bash
# Install Elasticsearch Python client
pip3 install elasticsearch
```

---

## Related Files

- `/home/odin/projects/autos/data/scripts/load_vin_data.py` - Original VIN loading script
- `/home/odin/projects/autos/data/scripts/create_vins_index.py` - Create autos-vins index schema
- `/home/odin/projects/autos/backend/src/controllers/vehicleController.js` - Backend VIN fetching logic

---

**Created**: 2025-11-08
**Author**: Claude Code
**Purpose**: Document VIN-Vehicle data integrity verification and remediation
