# AUTOS Data Sources and Model Specification

## Document Information

**Project:** AUTOS  
**Document Type:** Technical Data Specification  
**Date Created:** October 11, 2025  
**Version:** 1.0  
**Target Audience:** Backend Developers, Data Engineers, Database Administrators

---

## Table of Contents

1. [Data Sources Research](#data-sources-research)
2. [Data Model Specification](#data-model-specification)
3. [ETL Strategy](#etl-strategy)
4. [Elasticsearch Index Design](#elasticsearch-index-design)
5. [Data Quality & Validation](#data-quality--validation)

---

## Data Sources Research

### Overview

This section documents publicly available automobile datasets that require no authentication, tokens, or paid subscriptions for access. All sources listed are suitable for the AUTOS MVP and comply with our "freely available" requirement.

---

### Primary Data Sources (Recommended)

#### 1. NHTSA vPIC (Vehicle Product Information Catalog) ⭐ PRIMARY SOURCE

**Source Details:**
- **Provider:** National Highway Traffic Safety Administration (US Government)
- **URL:** https://vpic.nhtsa.dot.gov/
- **API Documentation:** https://vpic.nhtsa.dot.gov/api/
- **Coverage:** Model years 1981-present (VIN standardization era)
- **Update Frequency:** Ongoing (real-time API access)
- **Cost:** Free, no registration required
- **Rate Limits:** None documented (24/7 availability)
- **License:** Public domain (US Government data)

**Data Available:**
- Make and Model information
- Manufacturer details (company names, locations)
- Body styles and types
- Engine specifications (type, displacement, cylinders)
- Transmission types
- Drive type (FWD, RWD, AWD, 4WD)
- VIN decoding capabilities
- Vehicle categories and classifications

**Key API Endpoints:**

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `/vehicles/GetAllManufacturers` | Retrieve all manufacturers | Returns complete manufacturer list |
| `/vehicles/GetMakesForManufacturer/{id}` | Get makes by manufacturer | Ford Motor Company → Ford, Lincoln, Mercury |
| `/vehicles/GetModelsForMake/{make}` | Get models for a make | Ford → F-150, Mustang, Explorer |
| `/vehicles/GetModelsForMakeYear/{make}/{year}` | Models by make and year | Ford 1965 → Mustang, Galaxie, Thunderbird |
| `/vehicles/DecodeVin/{vin}` | Decode VIN to specs | Full vehicle specifications |

**Response Format:** JSON, XML, CSV (configurable)

**Strengths:**
- ✅ Most comprehensive free source
- ✅ Government-verified data (high accuracy)
- ✅ Real-time API access
- ✅ No authentication required
- ✅ Covers modern vehicles well (1981+)

**Limitations:**
- ⚠️ Limited pre-1981 data (before VIN standardization)
- ⚠️ Production numbers not included
- ⚠️ No restoration metadata (rarity, parts availability)
- ⚠️ No historical/cultural context

**Database Download Option:**
- Standalone vPIC database available
- Format: MS SQL Server 2019 backup file
- Size: ~2-3 GB compressed
- Update: Quarterly snapshots available
- Use Case: Offline development, bulk processing

---

#### 2. EPA Fuel Economy Data ⭐ SUPPLEMENTARY SOURCE

**Source Details:**
- **Provider:** Environmental Protection Agency (US Government)
- **URL:** https://www.fueleconomy.gov/feg/download.shtml
- **API:** https://www.fueleconomy.gov/ws/
- **Coverage:** 1978-present (robust from 1984+)
- **Update Frequency:** Annual (February release for previous model year)
- **Cost:** Free, public domain
- **License:** US Government data

**Data Available:**
- Fuel economy ratings (city/highway/combined MPG)
- Engine specifications
  - Displacement (liters)
  - Cylinders
  - Aspiration (naturally aspirated, turbocharged, supercharged)
- Transmission details
  - Type (automatic, manual, CVT)
  - Number of speeds
- Drive type (2WD, 4WD, AWD)
- Fuel type (gasoline, diesel, electric, hybrid)
- Vehicle class (compact, midsize, SUV, pickup, etc.)
- Emissions data (CO2, smog rating)

**File Formats:** CSV, Excel (.xls, .xlsx), XML

**Key Datasets:**

| Dataset | Years | Records | Size | Purpose |
|---------|-------|---------|------|---------|
| `vehicles.csv` | 1984-present | 40,000+ | ~15 MB | Primary vehicle data |
| `emissions.csv` | 2000-present | 30,000+ | ~8 MB | Emissions ratings |
| `fuelprices.csv` | 2000-present | 1,000+ | ~50 KB | Historical fuel prices |

**API Endpoints:**
- `/ws/rest/vehicle/menu/make` - List of makes
- `/ws/rest/vehicle/menu/model?make={make}` - Models by make
- `/ws/rest/vehicle/{id}` - Complete vehicle record

**Strengths:**
- ✅ Detailed engine specifications
- ✅ Transmission details
- ✅ Well-structured CSV files
- ✅ Complements NHTSA data well
- ✅ Annual updates reliable

**Limitations:**
- ⚠️ Sparse data before 1984
- ⚠️ Focus on fuel economy (limited other specs)
- ⚠️ No body style information
- ⚠️ No production numbers

---

### Supplementary Data Sources

#### 3. UCI Machine Learning Repository - Automobile Dataset

**Source Details:**
- **Provider:** University of California, Irvine
- **URL:** https://archive.ics.uci.edu/dataset/10/automobile
- **Coverage:** Historic dataset (1985 data snapshot)
- **Records:** 205 instances
- **Size:** 8.3 KB
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)

**Data Available:**
- Make (26 manufacturers: alfa-romero, audi, bmw, chevrolet, dodge, honda, etc.)
- Body style (hardtop, wagon, sedan, hatchback, convertible)
- Engine specifications (size, type, horsepower)
- Physical dimensions (length, width, height, weight)
- Insurance risk rating

**Use Cases:**
- ✅ Testing and development
- ✅ Machine learning model training
- ✅ Reference for body style classifications

**Limitations:**
- ⚠️ Very limited scope (205 vehicles)
- ⚠️ Outdated (1985 snapshot)
- ⚠️ Not suitable as primary data source

---

#### 4. GitHub - US Car Models Data

**Source Details:**
- **Repository:** https://github.com/abhionlyone/us-car-models-data
- **Coverage:** Model years 1992-2026
- **Records:** 15,000+ entries
- **Format:** CSV, JSON
- **License:** Open source (MIT)

**Data Available:**
- Make and model
- Model year
- Vehicle type
- Basic specifications

**Strengths:**
- ✅ Community-maintained
- ✅ Includes recent/upcoming models (2024-2026)
- ✅ Clean, structured format

**Limitations:**
- ⚠️ Limited to 1992+
- ⚠️ Sparse technical details
- ⚠️ Update frequency inconsistent

**Use Case:** Supplementary data for recent vehicles, validation against NHTSA

---

#### 5. Kaggle Automobile Datasets

**Source Details:**
- **Platform:** Kaggle (https://kaggle.com)
- **Notable Dataset:** https://www.kaggle.com/datasets/toramky/automobile-dataset
- **License:** Varies by dataset (check individual listings)

**Limitation:** ⚠️ Requires free Kaggle account (violates "no login" requirement for automated access)

**Recommendation:** Can be used for initial research/validation but not for production ETL pipeline

---

### Commercial APIs (Not Recommended for MVP)

#### 6. CarAPI

**Source Details:**
- **URL:** https://carapi.app/
- **Coverage:** 90,000+ vehicles (1900-present)
- **Features:** 
  - Complete specifications
  - VIN decoding
  - License plate lookup
  - Images and branding assets

**Pricing:**
- Free tier: Development/testing only
- Paid tier: Required for production use
- Cost: Pay-per-request model

**Recommendation:** ❌ Not suitable for MVP due to paid requirement. Consider for Phase 2+ if free sources insufficient.

---

## Data Model Specification

### Core Principles

1. **Normalization:** Avoid redundancy while maintaining query performance
2. **Extensibility:** Easy to add new attributes without schema changes
3. **Persona Flexibility:** Single model supports multiple persona views
4. **Historical Accuracy:** Preserve year-specific variations
5. **Source Tracking:** Maintain provenance for all data points

---

### Entity Relationship Overview

```
Manufacturer (1) ──────< (N) Make (1) ──────< (N) Model (1) ──────< (N) VehicleYear
                                                                              │
                                                                              ├──< Engine (N)
                                                                              ├──< Transmission (N)
                                                                              ├──< BodyStyle (N)
                                                                              └──< EnthusiastMetadata (1)
```

---

### Vehicle Core Entity

**Purpose:** Primary entity representing a unique make-model-year combination

```typescript
interface VehicleCore {
  // Identity
  id: string;                          // UUID
  make: string;                        // e.g., "Ford"
  model: string;                       // e.g., "F-100"
  year: number;                        // Model year (1900-2026)
  
  // Classification
  manufacturer: string;                // Parent company (e.g., "Ford Motor Company")
  manufacturerId: string;              // Link to Manufacturer entity
  
  // Body & Style
  bodyStyle: string[];                 // ["Pickup", "Truck"]
  bodyType: string;                    // "Pickup Truck"
  vehicleClass: string;                // EPA classification
  eraClassification: string;           // "Brass Era", "Vintage", "Classic", etc.
  
  // Physical Specs
  wheelbase: number | null;            // Inches
  length: number | null;               // Inches
  width: number | null;                // Inches
  height: number | null;               // Inches
  curbWeight: number | null;           // Pounds
  gvwr: number | null;                 // Gross Vehicle Weight Rating (pounds)
  
  // Production
  yearIntroduced: number | null;       // First year of this generation
  yearDiscontinued: number | null;     // Last year produced (null if still in production)
  productionTotal: number | null;      // Total units produced (all years)
  productionThisYear: number | null;   // Units produced for this specific year
  
  // Data Provenance
  dataSources: string[];               // ["NHTSA", "EPA", "Manual"]
  lastUpdated: Date;
  dataQuality: number;                 // 0-100 completeness score
}
```

---

### Engine Specification Entity

**Purpose:** Engine configurations available for a specific vehicle-year

```typescript
interface EngineSpec {
  id: string;
  vehicleId: string;                   // Foreign key to VehicleCore
  
  // Basic Specs
  engineType: string;                  // "Flathead Inline-6", "Small Block V8"
  configuration: string;               // "I4", "I6", "V6", "V8", "Boxer-4"
  cylinders: number;                   // 4, 6, 8, 10, 12
  
  // Displacement
  displacementCubicInches: number | null;
  displacementLiters: number | null;
  
  // Performance
  horsepower: number | null;           // HP @ RPM
  horsepowerRpm: number | null;
  torque: number | null;               // lb-ft @ RPM
  torqueRpm: number | null;
  
  // Fuel System
  fuelType: string;                    // "Gasoline", "Diesel", "Electric", "Hybrid"
  fuelDelivery: string;                // "Carburetor", "Fuel Injection", "Direct Injection"
  aspiration: string;                  // "Naturally Aspirated", "Turbocharged", "Supercharged"
  
  // Electrical
  voltageSystem: string;               // "6V", "12V", "24V"
  ignitionType: string;                // "Points", "Electronic", "Distributorless"
  
  // Metadata
  isStandardEngine: boolean;           // True if base engine, false if optional
  engineCode: string | null;           // Manufacturer's engine code (e.g., "Windsor 289")
  matchingNumbersSignificance: boolean; // True if matching numbers affect value
}
```

---

### Transmission Entity

**Purpose:** Transmission options for a specific vehicle-year

```typescript
interface TransmissionSpec {
  id: string;
  vehicleId: string;                   // Foreign key to VehicleCore
  
  // Type
  transmissionType: string;            // "Manual", "Automatic", "CVT", "DCT"
  numberOfSpeeds: number;              // 3, 4, 5, 6, 7, 8, 9, 10
  
  // Configuration
  shiftType: string;                   // "Column", "Floor", "Steering Wheel", "Electronic"
  overdrive: boolean;                  // Has overdrive gear
  
  // Drivetrain
  driveType: string;                   // "RWD", "FWD", "4WD", "AWD"
  transferCase: string | null;         // For 4WD/AWD vehicles
  rearAxleRatio: number | null;        // e.g., 3.73:1
  
  // Metadata
  isStandardTransmission: boolean;     // True if base, false if optional
  transmissionCode: string | null;     // Manufacturer code
}
```

---

### Enthusiast Metadata Entity

**Purpose:** Curated data specific to restoration/collector community

```typescript
interface EnthusiastMetadata {
  vehicleId: string;                   // Foreign key to VehicleCore (1:1)
  
  // Rarity & Collectibility
  rarityRating: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Extremely Rare';
  rarityScore: number;                 // 0-100 algorithmic score
  survivalRate: number | null;         // Estimated % of production still existing
  
  // Restoration
  partsAvailability: 'Easy' | 'Moderate' | 'Difficult' | 'Very Difficult';
  partsAvailabilityScore: number;      // 0-100
  restorationDifficulty: 'Beginner' | 'Intermediate' | 'Expert' | 'Master';
  restorationCostTier: 'Budget' | 'Mid' | 'Premium' | 'Exotic';
  estimatedRestorationCost: {
    low: number;                       // USD
    high: number;
  } | null;
  
  // Technical Considerations
  rustSusceptibility: 'Low' | 'Moderate' | 'High' | 'Severe';
  commonIssues: string[];              // ["Frame rust", "Cab corners", "Bed floor"]
  recommendedModifications: string[];  // ["Disc brake conversion", "Electronic ignition"]
  
  // Community
  clubsAndOrganizations: string[];     // Links to clubs
  forumResources: string[];            // URLs to active forums
  
  // Market Data (if available)
  currentValueEstimate: {
    condition1: number | null;         // Concours condition (USD)
    condition2: number | null;         // Excellent
    condition3: number | null;         // Good
    condition4: number | null;         // Fair
    condition5: number | null;         // Project
  };
  valueAppreciationTrend: 'Rising' | 'Stable' | 'Declining' | 'Unknown';
  
  // Curation
  curatedBy: string | null;            // Editor/curator name
  lastReviewed: Date;
  approvalStatus: 'Draft' | 'Reviewed' | 'Published';
}
```

---

### Historical Content Entity

**Purpose:** Rich "About X" page content for detailed vehicle histories

```typescript
interface VehicleHistory {
  vehicleId: string;                   // Foreign key to VehicleCore
  
  // Overview
  historicalSignificance: string;      // Markdown text
  legacySummary: string;               // Short paragraph
  
  // Design & Development
  designers: Array<{
    name: string;
    role: string;                      // "Lead Designer", "Chief Engineer"
    biography: string;                 // Markdown
    otherNotableWorks: string[];
  }>;
  
  developmentStory: string;            // Markdown text
  designPhilosophy: string;
  technicalInnovations: string[];
  
  // Production
  factoryLocations: Array<{
    city: string;
    state: string;
    country: string;
    yearsActive: string;               // "1953-1956"
  }>;
  
  productionMilestones: Array<{
    year: number;
    event: string;
    significance: string;
  }>;
  
  specialEditions: Array<{
    name: string;
    year: number;
    productionCount: number | null;
    distinguishingFeatures: string[];
  }>;
  
  // Cultural Impact
  movieAppearances: Array<{
    title: string;
    year: number;
    role: string;                      // "Hero car", "Background", "Featured"
  }>;
  
  tvAppearances: Array<{
    series: string;
    years: string;
    description: string;
  }>;
  
  celebrityOwners: string[];
  racingHeritage: string | null;       // Markdown text
  advertisingCampaigns: Array<{
    year: number;
    tagline: string;
    description: string;
    imageUrl: string | null;
  }>;
  
  // Notable Examples
  famousVehicles: Array<{
    description: string;               // "First production unit", "Steve McQueen's personal truck"
    currentLocation: string | null;    // Museum, private collection, etc.
    imageUrl: string | null;
  }>;
  
  // Sources & Citations
  sources: Array<{
    type: string;                      // "Book", "Magazine", "Website", "Interview"
    citation: string;                  // Proper citation format
    url: string | null;
  }>;
}
```

---

## ETL Strategy

### Data Ingestion Pipeline

#### Phase 1: Initial Load (MVP)

**Step 1: NHTSA Data Extraction**
```
┌─────────────────┐
│  NHTSA vPIC API │
└────────┬────────┘
         │ Batch API calls (paginated)
         ↓
┌─────────────────┐
│  Raw JSON Files │ (~2-3 GB)
└────────┬────────┘
         │ Node.js ETL script
         ↓
┌─────────────────┐
│ Staging Database│ (PostgreSQL/MongoDB)
└────────┬────────┘
         │ Transformation & Validation
         ↓
┌─────────────────┐
│  Elasticsearch  │ (autos-unified index)
└─────────────────┘
```

**Frequency:** One-time initial load (20-40 hours estimated)

**Step 2: EPA Data Enrichment**
```
┌──────────────────┐
│ EPA CSV Download │ (vehicles.csv, ~15 MB)
└────────┬─────────┘
         │ Parse CSV
         ↓
┌─────────────────┐
│  Staging DB     │
└────────┬────────┘
         │ Match to NHTSA data (Make + Model + Year)
         ↓
┌─────────────────┐
│  Elasticsearch  │ (merge/update existing docs)
└─────────────────┘
```

**Frequency:** Annual (February each year)

**Step 3: Enthusiast Metadata Curation**
```
┌──────────────────┐
│ Manual Curation  │ (Admin UI)
└────────┬─────────┘
         │ Editors add rarity, parts availability, etc.
         ↓
┌─────────────────┐
│  Staging DB     │ (approval workflow)
└────────┬────────┘
         │ Publish approved entries
         ↓
┌─────────────────┐
│  Elasticsearch  │ (merge metadata)
└─────────────────┘
```

**Frequency:** Ongoing (weekly batch updates)

---

### Data Transformation Rules

#### Make/Model Normalization

**Problem:** Inconsistent naming across sources
- NHTSA: "FORD MOTOR COMPANY" / "FORD"
- EPA: "Ford" / "Ford Motor Co"

**Solution:** Canonical name mapping table
```typescript
{
  canonical: "Ford",
  aliases: ["FORD", "Ford Motor Company", "FORD MOTOR COMPANY", "Ford Motor Co"],
  manufacturerId: "uuid-ford-001"
}
```

#### Body Style Mapping

**Problem:** Different classification systems
- NHTSA: "Truck" (generic)
- EPA: "Standard Pickup Trucks"
- Enthusiast: "Light Duty Pickup"

**Solution:** Multi-tier classification
```typescript
{
  nhtsa: "Truck",
  epa: "Standard Pickup Trucks",
  bodyStyle: ["Pickup", "Truck"],           // Array for picker filters
  eraClassification: "Classic",              // Derived from year
  vehicleClass: "Pickup Truck"               // Display name
}
```

#### Era Classification Logic

**Rules:**
```typescript
function classifyEra(year: number): string {
  if (year < 1916) return 'Horseless Carriage';
  if (year >= 1896 && year <= 1915) return 'Brass Era';
  if (year >= 1919 && year <= 1930) return 'Vintage';
  if (year >= 1931 && year <= 1941) return 'Pre-War';
  if (year >= 1945 && year <= 1960) return 'Post-War';
  if (year >= 1960 && year <= 1980) return 'Classic';
  if (year >= 1980 && year <= 2000) return 'Modern Classic';
  if (year >= 2000) return 'Youngtimer';
  return 'Unknown';
}
```

#### Rarity Scoring Algorithm

**Inputs:**
- Production total (lower = rarer)
- Survival rate estimate (if available)
- Collector interest (manual curation)

**Formula:**
```typescript
function calculateRarityScore(
  productionTotal: number,
  survivalRate: number | null,
  collectorInterest: number // 0-100
): number {
  let score = 0;
  
  // Production rarity (max 50 points)
  if (productionTotal < 100) score += 50;
  else if (productionTotal < 1000) score += 40;
  else if (productionTotal < 10000) score += 30;
  else if (productionTotal < 100000) score += 20;
  else score += 10;
  
  // Survival rate (max 25 points)
  if (survivalRate !== null) {
    score += (1 - survivalRate) * 25;
  }
  
  // Collector interest (max 25 points)
  score += collectorInterest * 0.25;
  
  return Math.min(score, 100);
}
```

---

## Elasticsearch Index Design

### Index Configuration

**Index Name:** `autos-unified`

**Settings:**
```json
{
  "index": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s",
    "max_result_window": 10000
  },
  "analysis": {
    "analyzer": {
      "vehicle_analyzer": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": [
          "lowercase",
          "asciifolding",
          "vehicle_synonyms"
        ]
      }
    },
    "filter": {
      "vehicle_synonyms": {
        "type": "synonym",
        "synonyms": [
          "truck, pickup",
          "suv, sport utility vehicle",
          "convertible, roadster, cabriolet",
          "coupe, 2-door"
        ]
      }
    }
  }
}
```

**Mapping:**
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "make": { 
        "type": "text", 
        "analyzer": "vehicle_analyzer",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "model": { 
        "type": "text",
        "analyzer": "vehicle_analyzer",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "year": { "type": "integer" },
      "manufacturer": { 
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "bodyStyle": { "type": "keyword" },
      "bodyType": { "type": "keyword" },
      "vehicleClass": { "type": "keyword" },
      "eraClassification": { "type": "keyword" },
      "yearIntroduced": { "type": "integer" },
      "yearDiscontinued": { "type": "integer" },
      "productionTotal": { "type": "integer" },
      
      "engines": {
        "type": "nested",
        "properties": {
          "engineType": { "type": "keyword" },
          "configuration": { "type": "keyword" },
          "cylinders": { "type": "integer" },
          "displacementLiters": { "type": "float" },
          "horsepower": { "type": "integer" },
          "fuelType": { "type": "keyword" }
        }
      },
      
      "transmissions": {
        "type": "nested",
        "properties": {
          "transmissionType": { "type": "keyword" },
          "numberOfSpeeds": { "type": "integer" },
          "driveType": { "type": "keyword" }
        }
      },
      
      "enthusiastMetadata": {
        "type": "object",
        "properties": {
          "rarityRating": { "type": "keyword" },
          "rarityScore": { "type": "integer" },
          "partsAvailability": { "type": "keyword" },
          "restorationDifficulty": { "type": "keyword" }
        }
      },
      
      "dataSources": { "type": "keyword" },
      "lastUpdated": { "type": "date" },
      "dataQuality": { "type": "integer" }
    }
  }
}
```

---

### Query Patterns

#### Picker Table Query (Manufacturer + Model combinations)

**Use Case:** Load data for vehicle picker table with filters

```javascript
{
  "size": 50,
  "from": 0,
  "query": {
    "bool": {
      "must": [
        { "match_all": {} }
      ],
      "filter": [
        { "terms": { "eraClassification": ["Classic", "Vintage"] } },
        { "terms": { "bodyStyle": ["Pickup", "Roadster"] } }
      ]
    }
  },
  "aggs": {
    "manufacturers": {
      "terms": { 
        "field": "manufacturer.keyword",
        "size": 100
      },
      "aggs": {
        "models": {
          "terms": {
            "field": "model.keyword",
            "size": 100
          }
        }
      }
    }
  },
  "sort": [
    { "make.keyword": "asc" },
    { "model.keyword": "asc" },
    { "year": "desc" }
  ]
}
```

#### Global Search Query

**Use Case:** Search all columns from picker table search bar

```javascript
{
  "query": {
    "multi_match": {
      "query": "ford f100",
      "fields": [
        "make^3",          // Boost make matches
        "model^3",         // Boost model matches
        "manufacturer^2",
        "bodyType",
        "engineType"
      ],
      "type": "best_fields",
      "operator": "or",
      "fuzziness": "AUTO"
    }
  }
}
```

#### Detailed Vehicle Query

**Use Case:** Fetch complete specifications for selected vehicles

```javascript
{
  "query": {
    "bool": {
      "must": [
        { "term": { "make.keyword": "Ford" } },
        { "term": { "model.keyword": "F-100" } },
        { "range": { "year": { "gte": 1953, "lte": 1956 } } }
      ]
    }
  },
  "_source": {
    "includes": ["*"],
    "excludes": []
  }
}
```

---

## Data Quality & Validation

### Quality Metrics

**Data Completeness Score (0-100):**
```typescript
function calculateDataQuality(vehicle: VehicleCore): number {
  const fields = {
    critical: ['make', 'model', 'year', 'bodyStyle'],
    important: ['manufacturer', 'yearIntroduced', 'bodyType'],
    optional: ['wheelbase', 'productionTotal', 'curbWeight']
  };
  
  let score = 0;
  
  // Critical fields: 60 points total (15 each)
  fields.critical.forEach(field => {
    if (vehicle[field] !== null && vehicle[field] !== undefined) {
      score += 15;
    }
  });
  
  // Important fields: 30 points total (10 each)
  fields.important.forEach(field => {
    if (vehicle[field] !== null && vehicle[field] !== undefined) {
      score += 10;
    }
  });
  
  // Optional fields: 10 points total (variable)
  const optionalFilled = fields.optional.filter(
    field => vehicle[field] !== null && vehicle[field] !== undefined
  ).length;
  score += (optionalFilled / fields.optional.length) * 10;
  
  return Math.round(score);
}
```

### Validation Rules

**Required Fields:**
- `make` (cannot be null/empty)
- `model` (cannot be null/empty)
- `year` (must be 1900-2026)
- `bodyStyle` (must contain at least one value)

**Data Type Validation:**
- All numeric fields must be positive
- Dates must be valid ISO 8601 format
- Enum fields must match allowed values

**Referential Integrity:**
- `vehicleId` in Engine/Transmission must exist in VehicleCore
- `manufacturerId` must exist in Manufacturer table

**Business Logic Validation:**
- `yearDiscontinued` must be >= `yearIntroduced`
- `productionThisYear` must be <= `productionTotal`
- `cylinders` must match `configuration` (e.g., V8 → 8 cylinders)

### Data Refresh Strategy

**Frequency:**
- **NHTSA data:** Quarterly refresh (API calls)
- **EPA data:** Annual refresh (February CSV download)
- **Enthusiast metadata:** Weekly batch updates (manual curation)
- **Historical content:** As available (editorial workflow)

**Incremental Updates:**
- Use `lastUpdated` timestamp to identify stale records
- Compare source data hashes to detect changes
- Update only modified records (avoid full reindex)

---

## Appendix: Data Mapping Tables

### Body Style Standardization

| NHTSA Body Type | EPA Vehicle Class | Standardized Body Style | Era-Specific Name |
|-----------------|-------------------|------------------------|-------------------|
| Truck | Standard Pickup Trucks | Pickup, Truck | Light Duty Pickup |
| Convertible/Cabriolet | Two Seaters | Roadster, Convertible | Roadster (pre-1960), Convertible (1960+) |
| Coupe | Subcompact Cars | Coupe | 2-Door Coupe |
| Sedan/Saloon | Midsize Cars | Sedan | 4-Door Sedan |
| Station Wagon | Midsize Station Wagons | Wagon, Station Wagon | Woody (pre-1960), Station Wagon (1960+) |
| Sport Utility Vehicle | Standard Sport Utility Vehicles | SUV, Utility | Sport Utility Vehicle |

### Engine Configuration Codes

| Code | Full Name | Typical Cylinders |
|------|-----------|-------------------|
| I4 | Inline 4-cylinder | 4 |
| I6 | Inline 6-cylinder | 6 |
| V6 | V-configuration 6-cylinder | 6 |
| V8 | V-configuration 8-cylinder | 8 |
| V10 | V-configuration 10-cylinder | 10 |
| V12 | V-configuration 12-cylinder | 12 |
| H4 | Horizontally-opposed 4-cylinder (Boxer) | 4 |
| H6 | Horizontally-opposed 6-cylinder | 6 |
| W12 | W-configuration 12-cylinder | 12 |

---

## Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-11 | 1.0 | Initial consolidated document | Planning Session |

---

**Next Steps:**
1. Review and approve data sources and model
2. Implement ETL pipeline for Phase 1 MVP
3. Configure Elasticsearch index
4. Begin NHTSA data ingestion testing