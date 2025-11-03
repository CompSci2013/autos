const express = require('express');
const router = express.Router();
const {
  getManufacturerModelCombinationsHandler,
  getVehicleDetailsHandler,
  getAllVinsHandler,
  getVehicleInstancesHandler,
  getFilterOptionsHandler,
} = require('../controllers/vehicleController');

/**
 * GET /api/v1/manufacturer-model-combinations
 * Returns aggregated manufacturer-model data from Elasticsearch
 * 
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - size: Results per page (default: 50, max: 100)
 *   - search: Search term for manufacturer/model/body_class
 *   - manufacturer: Filter by specific manufacturer
 */
router.get('/manufacturer-model-combinations', getManufacturerModelCombinationsHandler);

/**
 * GET /api/v1/vehicles/details
 * Returns paginated vehicle specification records based on selected models
 *
 * Query parameters:
 *   - models: Comma-separated manufacturer:model pairs (e.g., Ford:F-150,Chevrolet:Corvette)
 *   - page: Page number (default: 1)
 *   - size: Results per page (default: 20, max: 100)
 *   - manufacturerSearch: Partial match on manufacturer field only (table column filter)
 *   - modelSearch: Partial match on model field only (table column filter)
 *   - bodyClassSearch: Partial match on body_class field only (table column filter)
 *   - dataSourceSearch: Partial match on data_source field only (table column filter)
 *   - manufacturer: Exact match on manufacturer field (Query Control filter)
 *   - model: Exact match on model field (Query Control filter)
 *   - yearMin: Minimum year filter
 *   - yearMax: Maximum year filter
 *   - bodyClass: Exact match on body_class field (Query Control filter)
 *   - dataSource: Exact match on data_source field (Query Control filter)
 *   - sortBy: Field to sort by
 *   - sortOrder: Sort order (asc/desc)
 */
router.get('/vehicles/details', getVehicleDetailsHandler);

/**
 * GET /api/v1/vins
 * Returns all VINs with pagination, filtering, and sorting
 *
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - size: Results per page (default: 20, max: 100)
 *   - manufacturer: Filter by manufacturer
 *   - model: Filter by model
 *   - yearMin: Minimum year
 *   - yearMax: Maximum year
 *   - bodyClass: Filter by body class
 *   - mileageMin: Minimum mileage
 *   - mileageMax: Maximum mileage
 *   - valueMin: Minimum estimated value
 *   - valueMax: Maximum estimated value
 *   - sortBy: Field to sort by (default: vin)
 *   - sortOrder: Sort order (asc/desc, default: asc)
 */
router.get('/vins', getAllVinsHandler);

/**
 * GET /api/v1/vehicles/:vehicleId/instances
 * Returns VINs for a specific vehicle specification
 *
 * Path parameters:
 *   - vehicleId: Vehicle specification ID (e.g., nhtsa-ford-mustang-1967)
 *
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - pageSize: Results per page (default: 20, max: 100)
 */
router.get('/vehicles/:vehicleId/instances', getVehicleInstancesHandler);

/**
 * GET /api/v1/filters/:fieldName
 * Returns distinct values for the specified filter field
 *
 * Path parameters:
 *   - fieldName: manufacturers, models, body-classes, data-sources, or year-range
 *
 * Response format varies by field:
 *   - manufacturers: { manufacturers: string[] }
 *   - models: { models: string[] }
 *   - body-classes: { body_classes: string[] }
 *   - data-sources: { data_sources: string[] }
 *   - year-range: { min: number, max: number }
 */
router.get('/filters/:fieldName', getFilterOptionsHandler);

module.exports = router;
