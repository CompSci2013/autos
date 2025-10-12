const express = require('express');
const router = express.Router();
const { getManufacturerModelCombinationsHandler } = require('../controllers/vehicleController');

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

module.exports = router;
