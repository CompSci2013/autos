# Epic 6: Data Management & Backend Infrastructure

**Epic ID:** EPIC-6
**Epic Owner:** Backend Lead & Data Engineer
**Status:** Complete
**Priority:** Critical
**Business Value:** Reliable, scalable backend serving accurate vehicle data with high performance

---

## Epic Description

Build and maintain backend infrastructure including Elasticsearch integration, synthetic VIN generation, data pipeline, API endpoints, and Kubernetes deployment. Ensure data quality, API performance, and system reliability.

**Success Metrics:**
- API response time p95 < 1 second
- 99.9% API uptime
- 100,000 vehicle records searchable
- Zero data integrity issues

---

## Feature 6.1: Elasticsearch Integration

### Story 6.1.1: Elasticsearch Connection Management

**As a** system administrator,
**I want** the backend to establish and manage Elasticsearch connections reliably,
**So that** data queries are fast and resilient.

**Priority:** Critical
**Story Points:** 8
**Sprint:** Sprint 1 (Foundation)

#### Acceptance Criteria
- [ ] Connection established on server startup
- [ ] Connection test before server starts accepting requests
- [ ] Fail-fast if connection fails (exit process)
- [ ] Retry logic for transient connection issues
- [ ] Health check endpoint verifies ES connectivity
- [ ] Environment variable configuration: `ELASTICSEARCH_URL`

#### Technical Notes
- File: `src/config/elasticsearch.js`
- Client: `@elastic/elasticsearch` v8.11.0
- Config: 30s timeout, 3 max retries

#### Definition of Done
- [ ] Kubernetes liveness probe uses health endpoint
- [ ] Logs clear connection status messages
- [ ] No silent failures

---

### Story 6.1.2: Index Mapping and Schema

**As a** data engineer,
**I want** a well-defined Elasticsearch index schema,
**So that** queries are efficient and data types are correct.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 1

#### Acceptance Criteria
- [ ] Index name: `autos-unified`
- [ ] Field mappings:
  - `manufacturer` (text + keyword)
  - `model` (text + keyword)
  - `year` (integer)
  - `body_class` (text + keyword)
  - `data_source` (keyword)
  - `vehicle_id` (keyword)
  - `instance_count` (integer)
  - `make_model_year` (keyword)
- [ ] Optimized for aggregations and sorting
- [ ] Script: `create_autos_index.py`

#### Technical Notes
- Keyword fields for exact matching, sorting
- Text fields for fuzzy search
- No VINs stored (generated on-demand)

#### Definition of Done
- [ ] Index creation script idempotent
- [ ] Documentation of field purposes

---

### Story 6.1.3: Aggregation Query for M/M Combinations

**As a** backend developer,
**I want** an aggregation query that groups vehicles by manufacturer and model,
**So that** the picker component loads quickly.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 2

#### Acceptance Criteria
- [ ] Query aggregates by manufacturer (terms aggregation)
- [ ] Nested aggregation by model within each manufacturer
- [ ] Returns document count per model
- [ ] Supports fuzzy search on manufacturer/model names
- [ ] Performance: < 500ms for 100k documents

#### Technical Notes
- Endpoint: `GET /api/v1/manufacturer-model-combinations`
- Service method: `elasticsearchService.getManufacturerModelCombinations()`
- Uses `terms` and `top_hits` aggregations

#### Definition of Done
- [ ] Query optimized (no full table scan)
- [ ] Results cached (30 seconds)

---

### Story 6.1.4: Filtered Search Query

**As a** backend developer,
**I want** a query that returns vehicles matching multiple M/M pairs and filters,
**So that** search results are accurate and fast.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 3

#### Acceptance Criteria
- [ ] Boolean query with `should` clauses for model combos
- [ ] Filter clauses for year range, body class, data source
- [ ] Wildcard filtering for manufacturer/model partial matches
- [ ] Server-side sorting (manufacturer, model, year, etc.)
- [ ] Server-side pagination (`from`, `size`)
- [ ] Performance: < 1 second for complex queries

#### Technical Notes
- Endpoint: `GET /api/v1/vehicles/details`
- Service method: `elasticsearchService.getVehicleDetails()`
- Uses `bool` query with `must`, `should`, `filter`

#### Definition of Done
- [ ] Query plan analyzed (no inefficiencies)
- [ ] Handles edge cases (no selections, all filters)

---

## Feature 6.2: Synthetic VIN Generation

### Story 6.2.1: Deterministic VIN Algorithm

**As a** data engineer,
**I want** VINs generated deterministically from vehicle_id,
**So that** the same vehicle always produces the same VINs.

**Priority:** Critical
**Story Points:** 13
**Sprint:** Sprint 4

#### Acceptance Criteria
- [ ] Hash vehicle_id to seed
- [ ] Seeded random number generator (reproducible)
- [ ] Pre-1981 vs post-1981 VIN formats
- [ ] VIN structure follows industry standards
- [ ] No VINs stored in database (on-demand only)
- [ ] Utility: `vinGenerator.js`

#### Technical Notes
- Uses djb2 hash algorithm
- Linear congruential generator for randomness
- Formula: `(state * 1664525 + 1013904223) mod 2^32`

#### Definition of Done
- [ ] Same vehicle_id always generates same VINs
- [ ] VINs pass checksum validation (17-char VINs)

---

### Story 6.2.2: Realistic Vehicle Attributes

**As a** data engineer,
**I want** VIN instances to have realistic correlated attributes,
**So that** data feels authentic for demos and testing.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 4

#### Acceptance Criteria
- [ ] Mileage: Age-adjusted (5,000-12,000 miles/year average)
- [ ] Condition: Distribution-based (5% Concours, 15% Excellent, 35% Good, 30% Fair, 15% Project)
- [ ] State: Geographic weighting (CA 15%, TX 8%, FL 7%, etc.)
- [ ] Color: Era-appropriate (pre-1970 vs post-1970 palettes)
- [ ] Options: Condition-dependent (better condition = more original options)
- [ ] Value: Calculated from condition + mileage + options
- [ ] Matching numbers: True for high-condition vehicles

#### Technical Notes
- Methods:
  - `generateMileage(year)`
  - `generateCondition()`
  - `generateState()`
  - `generateColor(year)`
  - `generateOptions(conditionRating)`
  - `calculateValue(condition, mileage, options)`

#### Definition of Done
- [ ] Distributions statistically realistic
- [ ] Correlations make sense (e.g., low mileage = higher value)

---

### Story 6.2.3: VIN Instance API Endpoint

**As a** frontend developer,
**I want** an endpoint that returns VIN instances for a vehicle,
**So that** users can see individual vehicle details.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 5

#### Acceptance Criteria
- [ ] Endpoint: `GET /api/v1/vehicles/:vehicleId/instances`
- [ ] Query param: `count` (default: 8, max: 20)
- [ ] Response includes vehicle metadata + instances array
- [ ] Each instance has 14+ attributes (VIN, condition, mileage, etc.)
- [ ] Performance: < 200ms to generate 20 instances

#### Technical Notes
- Controller: `vehicleController.getVehicleInstancesHandler()`
- First queries ES for vehicle metadata
- Then generates instances via `VINGenerator.generateInstances()`

#### Definition of Done
- [ ] Error handling: 404 if vehicle_id not found
- [ ] Validation: count between 1-20

---

## Feature 6.3: Data Pipeline

### Story 6.3.1: Index Creation Script

**As a** data engineer,
**I want** a script to create the Elasticsearch index with proper mappings,
**So that** the database is initialized correctly.

**Priority:** Critical
**Story Points:** 3
**Sprint:** Sprint 1

#### Acceptance Criteria
- [ ] Script: `data/scripts/create_autos_index.py`
- [ ] Creates index: `autos-unified`
- [ ] Defines field mappings (text, keyword, integer)
- [ ] Idempotent (doesn't fail if index exists)
- [ ] Option to delete and recreate

#### Technical Notes
- Python with `elasticsearch` library
- Requires `ELASTICSEARCH_URL` env var

#### Definition of Done
- [ ] Documented usage in README
- [ ] Runs in Docker container

---

### Story 6.3.2: Sample Data Loader

**As a** developer,
**I want** a script to load sample data for development,
**So that** I can test the app without full dataset.

**Priority:** High
**Story Points:** 3
**Sprint:** Sprint 1

#### Acceptance Criteria
- [ ] Script: `data/scripts/load_sample_data.py`
- [ ] Loads 1,000 sample records
- [ ] Diverse manufacturers and models
- [ ] Realistic year distribution
- [ ] Fast execution (< 30 seconds)

#### Technical Notes
- Bulk insert API
- Batch size: 100 documents

#### Definition of Done
- [ ] Sample data covers edge cases
- [ ] Includes rare and common vehicles

---

### Story 6.3.3: Full Data Loader

**As a** data engineer,
**I want** a script to load the full 100,000 record dataset,
**So that** production data is available for testing and deployment.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 6

#### Acceptance Criteria
- [ ] Script: `data/scripts/load_full_data.py`
- [ ] Loads 100,000 records from data source
- [ ] Progress indicators (every 1000 records)
- [ ] Error handling (skip bad records, log errors)
- [ ] Execution time: < 10 minutes

#### Technical Notes
- Bulk insert with batching
- Memory-efficient (stream data)

#### Definition of Done
- [ ] Data quality validation
- [ ] Duplicate detection

---

### Story 6.3.4: Reset Index Script

**As a** developer,
**I want** a script to reset the index (delete all data and recreate),
**So that** I can start fresh during development.

**Priority:** Medium
**Story Points:** 2
**Sprint:** Sprint 6

#### Acceptance Criteria
- [ ] Script: `data/scripts/reset_index.py`
- [ ] Confirmation prompt: "Are you sure?"
- [ ] Deletes index
- [ ] Recreates with mappings
- [ ] Option to skip confirmation (--force flag)

#### Technical Notes
- Dangerous operation (production safeguard)

#### Definition of Done
- [ ] Logs actions clearly
- [ ] Works idempotently

---

## Feature 6.4: API Endpoints

### Story 6.4.1: Health Check Endpoint

**As a** system administrator,
**I want** a health check endpoint for monitoring,
**So that** Kubernetes can detect unhealthy pods.

**Priority:** Critical
**Story Points:** 2
**Sprint:** Sprint 7

#### Acceptance Criteria
- [ ] Endpoint: `GET /health`
- [ ] Response: `{ status: 'ok', service: 'autos-backend', timestamp: '...' }`
- [ ] Checks Elasticsearch connectivity
- [ ] Returns 200 if healthy, 503 if unhealthy
- [ ] Response time: < 100ms

#### Technical Notes
- Used by Kubernetes liveness/readiness probes

#### Definition of Done
- [ ] Tested with Kubernetes
- [ ] Logs health check failures

---

### Story 6.4.2: API Versioning

**As a** developer,
**I want** API endpoints versioned,
**So that** we can evolve the API without breaking clients.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 7

#### Acceptance Criteria
- [ ] All endpoints prefixed: `/api/v1/...`
- [ ] Future versions: `/api/v2/...`
- [ ] Version documented in response headers
- [ ] v1 supported indefinitely (backward compatibility)

#### Technical Notes
- Express router: `app.use('/api/v1', routes)`

#### Definition of Done
- [ ] Documentation specifies version
- [ ] Breaking changes only in new versions

---

### Story 6.4.3: API Rate Limiting

**As a** system administrator,
**I want** rate limiting on API endpoints,
**So that** abuse is prevented and resources are protected.

**Priority:** Medium
**Story Points:** 5
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Limit: 100 requests per minute per IP
- [ ] HTTP 429 response when exceeded
- [ ] Retry-After header included
- [ ] Whitelist for internal services

#### Technical Notes
- Middleware: `express-rate-limit`

#### Definition of Done
- [ ] Tested with load tool
- [ ] Documented for API users

---

## Feature 6.5: Kubernetes Deployment

### Story 6.5.1: Backend Deployment Manifest

**As a** DevOps engineer,
**I want** Kubernetes deployment manifests for the backend,
**So that** the API runs reliably in production.

**Priority:** Critical
**Story Points:** 8
**Sprint:** Sprint 8

#### Acceptance Criteria
- [ ] File: `k8s/backend-deployment.yaml`
- [ ] Replicas: 2 (high availability)
- [ ] Image: `localhost/autos-backend:v1.2.8`
- [ ] Environment variables: ES_URL, ES_INDEX, NODE_ENV, PORT
- [ ] Resource limits: 256Mi memory, 500m CPU
- [ ] Resource requests: 128Mi memory, 100m CPU
- [ ] Health probes: liveness and readiness on `/health`

#### Technical Notes
- Namespace: `autos`
- Node selector: `thor` (specific node)

#### Definition of Done
- [ ] Rolling updates with zero downtime
- [ ] Pods restart on health check failure

---

### Story 6.5.2: Backend Service Definition

**As a** DevOps engineer,
**I want** a Kubernetes service to expose the backend,
**So that** frontend can communicate with API.

**Priority:** Critical
**Story Points:** 3
**Sprint:** Sprint 8

#### Acceptance Criteria
- [ ] File: `k8s/backend-service.yaml`
- [ ] Type: ClusterIP (internal only)
- [ ] Port: 3000
- [ ] Internal DNS: `autos-backend.autos.svc.cluster.local`
- [ ] Load balances across replicas

#### Technical Notes
- Frontend proxies API requests to service

#### Definition of Done
- [ ] Service reachable from frontend pods
- [ ] Load balancing verified

---

### Story 6.5.3: Horizontal Pod Autoscaling

**As a** system administrator,
**I want** the backend to autoscale based on load,
**So that** we handle traffic spikes gracefully.

**Priority:** Low
**Story Points:** 5
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Min replicas: 2
- [ ] Max replicas: 10
- [ ] Scale up: CPU > 70% for 30 seconds
- [ ] Scale down: CPU < 30% for 5 minutes
- [ ] Metrics server installed

#### Technical Notes
- HorizontalPodAutoscaler (HPA) resource

#### Definition of Done
- [ ] Tested with load generator
- [ ] Scales smoothly without thrashing

---

## Feature 6.6: Monitoring & Logging

### Story 6.6.1: Structured Logging

**As a** developer,
**I want** structured JSON logs,
**So that** logs are easily parsed and analyzed.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 9

#### Acceptance Criteria
- [ ] JSON format: `{ timestamp, level, message, context }`
- [ ] Log levels: error, warn, info, debug
- [ ] Context includes: request ID, user ID, endpoint
- [ ] No sensitive data logged (passwords, tokens)

#### Technical Notes
- Library: `winston` or `pino`

#### Definition of Done
- [ ] Logs aggregated in centralized system (e.g., ELK stack)

---

### Story 6.6.2: API Metrics

**As a** system administrator,
**I want** metrics on API performance,
**So that** I can monitor health and optimize bottlenecks.

**Priority:** Medium
**Story Points:** 5
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Metrics exposed: `/metrics` endpoint (Prometheus format)
- [ ] Metrics tracked:
  - Request count per endpoint
  - Response time (p50, p95, p99)
  - Error rate
  - Elasticsearch query time
- [ ] Grafana dashboard for visualization

#### Technical Notes
- Library: `prom-client`

#### Definition of Done
- [ ] Metrics scraped by Prometheus
- [ ] Alerts configured for anomalies

---

## Backlog Stories (Future)

### Story 6.X.X: Database Backup & Restore
- Automated daily backups of Elasticsearch
- Point-in-time restore capability

### Story 6.X.X: Data Validation Pipeline
- Validate incoming data before indexing
- Reject malformed records

### Story 6.X.X: Data Versioning
- Track data schema versions
- Migration scripts for schema changes

### Story 6.X.X: Multi-Region Deployment
- Deploy backend in multiple regions
- Replicate Elasticsearch data for low latency

### Story 6.X.X: GraphQL API
- Alternative to REST API
- More flexible querying

---

**Epic Status:** 100% Complete (Core backend operational)
**Last Updated:** 2025-10-22
