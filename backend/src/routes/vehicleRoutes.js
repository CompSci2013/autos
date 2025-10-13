const express = require('express');
const router = express.Router();
const { 
  getManufacturerModelCombinationsHandler,
  getVehicleDetailsHandler 
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
 * Returns detailed vehicle records for selected manufacturer-model combinations
 * 
 * Query parameters:
 *   - models: Comma-separated manufacturer:model pairs (REQUIRED)
 *             Example: models=Ford:F-150,Chevrolet:Corvette
 *   - page: Page number (default: 1)
 *   - size: Results per page (default: 20, max: 100)
 */
router.get('/vehicles/details', getVehicleDetailsHandler);

module.exports = router;