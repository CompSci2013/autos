const { esClient, ELASTICSEARCH_INDEX } = require('../config/elasticsearch');

/**
 * Get manufacturer-model combinations using Elasticsearch aggregations
 * @param {Object} options - Query options (page, size, search, filters)
 * @returns {Object} - Aggregated manufacturer-model data
 */
async function getManufacturerModelCombinations(options = {}) {
  const {
    page = 1,
    size = 50,
    search = '',
    manufacturer = null
  } = options;

  try {
    // Build query
    const query = {
      bool: {
        must: []
      }
    };

    // Add search if provided - use different query types for different fields
    if (search) {
      query.bool.must.push({
        bool: {
          should: [
            {
              match: {
                manufacturer: {
                  query: search,
                  fuzziness: 'AUTO'
                }
              }
            },
            {
              match: {
                model: {
                  query: search,
                  fuzziness: 'AUTO'
                }
              }
            },
            {
              term: {
                'body_class.keyword': search
              }
            }
          ],
          minimum_should_match: 1
        }
      });
    }

    // Add manufacturer filter if provided
    if (manufacturer) {
      query.bool.must.push({
        term: { 'manufacturer.keyword': manufacturer }
      });
    }

    // If no filters, match all
    if (query.bool.must.length === 0) {
      query.bool.must.push({ match_all: {} });
    }

    // Execute aggregation query
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0, // We only want aggregations, not documents
      query: query,
      aggs: {
        manufacturers: {
          terms: {
            field: 'manufacturer.keyword',
            size: 100,
            order: { _key: 'asc' }
          },
          aggs: {
            models: {
              terms: {
                field: 'model.keyword',
                size: 100,
                order: { _key: 'asc' }
              }
            }
          }
        }
      }
    });

    // Extract and format results
    const manufacturers = response.aggregations.manufacturers.buckets.map(bucket => ({
      manufacturer: bucket.key,
      count: bucket.doc_count,
      models: bucket.models.buckets.map(modelBucket => ({
        model: modelBucket.key,
        count: modelBucket.doc_count
      }))
    }));

    // Apply pagination to manufacturers array
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedManufacturers = manufacturers.slice(startIndex, endIndex);

    return {
      total: manufacturers.length,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(manufacturers.length / size),
      data: paginatedManufacturers
    };

  } catch (error) {
    console.error('Elasticsearch query error:', error);
    throw new Error(`Failed to fetch vehicle data: ${error.message}`);
  }
}

/**
 * Get detailed vehicle records for specific manufacturer-model combinations
 * @param {Object} options - Query options
 * @param {Array} options.modelCombos - Array of {manufacturer, model} objects
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.size - Results per page
 * @returns {Object} - Paginated vehicle detail records
 */
async function getVehicleDetails(options = {}) {
  const {
    modelCombos = [],
    page = 1,
    size = 20
  } = options;

  try {
    // Build boolean query with should clauses for each manufacturer-model pair
    const shouldClauses = modelCombos.map(combo => ({
      bool: {
        must: [
          { term: { 'manufacturer.keyword': combo.manufacturer } },
          { term: { 'model.keyword': combo.model } }
        ]
      }
    }));

    // Calculate pagination
    const from = (page - 1) * size;

    // Execute search query
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      from: from,
      size: size,
      query: {
        bool: {
          should: shouldClauses,
          minimum_should_match: 1
        }
      },
      sort: [
        { 'manufacturer.keyword': { order: 'asc' } },
        { 'model.keyword': { order: 'asc' } },
        { 'year': { order: 'desc' } }
      ]
    });

    // Extract hits
    const results = response.hits.hits.map(hit => hit._source);

    return {
      total: response.hits.total.value,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(response.hits.total.value / size),
      query: {
        modelCombos: modelCombos
      },
      results: results
    };

  } catch (error) {
    console.error('Elasticsearch vehicle details query error:', error);
    throw new Error(`Failed to fetch vehicle details: ${error.message}`);
  }
}

module.exports = {
  getManufacturerModelCombinations,
  getVehicleDetails
};