const { getManufacturerModelCombinations } = require('../services/elasticsearchService');

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

module.exports = {
  getManufacturerModelCombinationsHandler
};
