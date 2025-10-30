const express = require('express');
const router = express.Router();
const {
  getManufacturerModelCombinationsHandler,
  getVehicleDetailsHandler,
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
 */
router.get('/vehicles/details', getVehicleDetailsHandler);

/**
 * GET /api/v1/vehicles/:vehicleId/instances
 * Returns synthetic VIN-level data for a specific vehicle specification
 *
 * Path parameters:
 *   - vehicleId: Vehicle specification ID (e.g., nhtsa-ford-mustang-1967)
 *
 * Query parameters:
 *   - count: Number of VIN instances to generate (default: 8, max: 20)
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
