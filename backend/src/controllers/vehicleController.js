const { getManufacturerModelCombinations, getVehicleDetails } = require('../services/elasticsearchService');

/**
 * Controller for manufacturer-model combinations endpoint
 * GET /api/v1/manufacturer-model-combinations
 */
async function getManufacturerModelCombinationsHandler(req, res, next) {
  try {
    // Extract query parameters
    const {
      page = 1,
      size = 50,
      search = '',
      manufacturer = null
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const sizeNum = parseInt(size);

    if (pageNum < 1 || sizeNum < 1 || sizeNum > 100) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        message: 'page must be >= 1, size must be between 1 and 100'
      });
    }

    // Call service to get data
    const result = await getManufacturerModelCombinations({
      page: pageNum,
      size: sizeNum,
      search,
      manufacturer
    });

    // Return successful response
    res.json(result);

  } catch (error) {
    console.error('Controller error:', error);
    next(error); // Pass to error handling middleware
  }
}

/**
 * Controller for vehicle details endpoint
 * GET /api/v1/vehicles/details
 * 
 * Query parameters:
 *   - models: Comma-separated manufacturer:model pairs (e.g., "Ford:F-150,Chevrolet:Corvette")
 *   - page: Page number (default: 1)
 *   - size: Results per page (default: 20, max: 100)
 */
async function getVehicleDetailsHandler(req, res, next) {
  try {
    // Extract and validate query parameters
    const {
      models = '',
      page = 1,
      size = 20
    } = req.query;

    // Validate models parameter
    if (!models || models.trim() === '') {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Query parameter "models" is required (e.g., models=Ford:F-150,Chevrolet:Corvette)'
      });
    }

    // Parse models parameter into array of {manufacturer, model} objects
    const modelCombos = models.split(',').map(combo => {
      const [manufacturer, model] = combo.split(':');
      
      if (!manufacturer || !model) {
        throw new Error(`Invalid model format: "${combo}". Expected format: "Manufacturer:Model"`);
      }
      
      return {
        manufacturer: manufacturer.trim(),
        model: model.trim()
      };
    });

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const sizeNum = parseInt(size);

    if (pageNum < 1 || sizeNum < 1 || sizeNum > 100) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        message: 'page must be >= 1, size must be between 1 and 100'
      });
    }

    // Call service to get vehicle details
    const result = await getVehicleDetails({
      modelCombos,
      page: pageNum,
      size: sizeNum
    });

    // Return successful response
    res.json(result);

  } catch (error) {
    console.error('Vehicle details controller error:', error);
    
    // Handle specific error types
    if (error.message.includes('Invalid model format')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }
    
    next(error); // Pass to error handling middleware
  }
}

module.exports = {
  getManufacturerModelCombinationsHandler,
  getVehicleDetailsHandler
};