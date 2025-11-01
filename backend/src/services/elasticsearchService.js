const { esClient, ELASTICSEARCH_INDEX } = require('../config/elasticsearch');

/**
 * Get manufacturer-model combinations using Elasticsearch aggregations
 * @param {Object} options - Query options (page, size, search, filters)
 * @returns {Object} - Aggregated manufacturer-model data
 */
async function getManufacturerModelCombinations(options = {}) {
  const { page = 1, size = 50, search = '', manufacturer = null } = options;

  try {
    // Build query
    const query = {
      bool: {
        must: [],
      },
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
                  fuzziness: 'AUTO',
                },
              },
            },
            {
              match: {
                model: {
                  query: search,
                  fuzziness: 'AUTO',
                },
              },
            },
            {
              term: {
                'body_class.keyword': search,
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }

    // Add manufacturer filter if provided
    if (manufacturer) {
      query.bool.must.push({
        term: { 'manufacturer.keyword': manufacturer },
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
            order: { _key: 'asc' },
          },
          aggs: {
            models: {
              terms: {
                field: 'model.keyword',
                size: 100,
                order: { _key: 'asc' },
              },
            },
          },
        },
      },
    });

    // Extract and format results
    const manufacturers = response.aggregations.manufacturers.buckets.map(
      (bucket) => ({
        manufacturer: bucket.key,
        count: bucket.doc_count,
        models: bucket.models.buckets.map((modelBucket) => ({
          model: modelBucket.key,
          count: modelBucket.doc_count,
        })),
      })
    );

    // Apply pagination to manufacturers array
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedManufacturers = manufacturers.slice(startIndex, endIndex);

    return {
      total: manufacturers.length,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(manufacturers.length / size),
      data: paginatedManufacturers,
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
 * @param {Object} options.filters - Filter criteria
 * @param {string} options.sortBy - Field to sort by
 * @param {string} options.sortOrder - Sort order (asc/desc)
 * @returns {Object} - Paginated vehicle detail records
 */
async function getVehicleDetails(options = {}) {
  const {
    modelCombos = [],
    page = 1,
    size = 20,
    filters = {},
    sortBy = null,
    sortOrder = 'asc',
  } = options;

  try {
    // Build the main query
    let query;

    if (modelCombos.length > 0) {
      // Build boolean query with should clauses for each manufacturer-model pair
      const shouldClauses = modelCombos.map((combo) => ({
        bool: {
          must: [
            { term: { 'manufacturer.keyword': combo.manufacturer } },
            { term: { 'model.keyword': combo.model } },
          ],
        },
      }));

      query = {
        bool: {
          should: shouldClauses,
          minimum_should_match: 1,
          filter: [],
        },
      };
    } else {
      // No model combos specified - match all vehicles
      query = {
        bool: {
          must: [{ match_all: {} }],
          filter: [],
        },
      };
    }

    // Apply filters (case-insensitive matching on analyzed fields)
    if (filters.manufacturer) {
      // Handle comma-separated manufacturers (OR logic)
      const manufacturers = filters.manufacturer.split(',').map(m => m.trim()).filter(m => m);

      if (manufacturers.length === 1) {
        // Single manufacturer: use match query for analyzed field
        query.bool.filter.push({
          match: {
            manufacturer: {
              query: manufacturers[0],
              operator: 'and' // All terms must match
            },
          },
        });
      } else if (manufacturers.length > 1) {
        // Multiple manufacturers: use should clause (OR logic)
        query.bool.filter.push({
          bool: {
            should: manufacturers.map(mfr => ({
              match: {
                manufacturer: {
                  query: mfr,
                  operator: 'and'
                },
              },
            })),
            minimum_should_match: 1,
          },
        });
      }
    }

    if (filters.model) {
      query.bool.filter.push({
        match: {
          model: {
            query: filters.model,
            operator: 'and'
          },
        },
      });
    }

    if (filters.yearMin !== undefined) {
      query.bool.filter.push({
        range: {
          year: { gte: filters.yearMin },
        },
      });
    }

    if (filters.yearMax !== undefined) {
      query.bool.filter.push({
        range: {
          year: { lte: filters.yearMax },
        },
      });
    }

    if (filters.bodyClass) {
      query.bool.filter.push({
        match: {
          body_class: {
            query: filters.bodyClass,
            operator: 'and'
          },
        },
      });
    }

    if (filters.dataSource) {
      query.bool.filter.push({
        match: {
          data_source: {
            query: filters.dataSource,
            operator: 'and'
          },
        },
      });
    }

    // Build sort array
    let sort;
    if (sortBy) {
      // Only manufacturer and model need .keyword (they are text fields with keyword sub-fields)
      // body_class and data_source are already pure keyword types
      // year is an integer type
      const sortField =
        sortBy === 'manufacturer' || sortBy === 'model'
          ? `${sortBy}.keyword`
          : sortBy;

      sort = [{ [sortField]: { order: sortOrder } }];
    } else {
      // Default sort
      sort = [
        { 'manufacturer.keyword': { order: 'asc' } },
        { 'model.keyword': { order: 'asc' } },
        { year: { order: 'desc' } },
      ];
    }

    // Calculate pagination
    const from = (page - 1) * size;

    // Execute search query
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      from: from,
      size: size,
      query: query,
      sort: sort,
    });

    // Extract hits
    const results = response.hits.hits.map((hit) => hit._source);

    return {
      total: response.hits.total.value,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(response.hits.total.value / size),
      query: {
        modelCombos: modelCombos,
        filters: filters,
        sortBy: sortBy,
        sortOrder: sortOrder,
      },
      results: results,
    };
  } catch (error) {
    console.error('Elasticsearch vehicle details query error:', error);
    throw new Error(`Failed to fetch vehicle details: ${error.message}`);
  }
}

/**
 * Get distinct manufacturers for filter dropdown
 * @param {string} searchTerm - Optional search term to filter manufacturers
 * @param {number} limit - Maximum number of results (default: 1000)
 * @returns {Array} - Sorted array of manufacturer names
 */
async function getDistinctManufacturers(searchTerm = '', limit = 1000) {
  try {
    // Build query based on search term
    let query = { match_all: {} };

    if (searchTerm && searchTerm.trim()) {
      // Use match query for efficient indexed search with fuzzy matching
      // This uses the analyzed 'manufacturer' field instead of 'manufacturer.keyword'
      // for better performance and case-insensitive partial matching
      query = {
        match: {
          manufacturer: {
            query: searchTerm,
            operator: 'and',
            fuzziness: 'AUTO',
          },
        },
      };
    }

    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      query: query,
      aggs: {
        manufacturers: {
          terms: {
            field: 'manufacturer.keyword',
            size: limit,
            order: { _key: 'asc' },
          },
        },
      },
    });

    return response.aggregations.manufacturers.buckets.map((bucket) => bucket.key);
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    throw new Error(`Failed to fetch manufacturers: ${error.message}`);
  }
}

/**
 * Get distinct models for filter dropdown
 * @returns {Array} - Sorted array of model names
 */
async function getDistinctModels() {
  try {
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      aggs: {
        models: {
          terms: {
            field: 'model.keyword',
            size: 2000,
            order: { _key: 'asc' },
          },
        },
      },
    });

    return response.aggregations.models.buckets.map((bucket) => bucket.key);
  } catch (error) {
    console.error('Error fetching models:', error);
    throw new Error(`Failed to fetch models: ${error.message}`);
  }
}

/**
 * Get distinct body classes for filter dropdown
 * @returns {Array} - Sorted array of body class names
 */
async function getDistinctBodyClasses() {
  try {
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      aggs: {
        body_classes: {
          terms: {
            field: 'body_class.keyword',
            size: 100,
            order: { _key: 'asc' },
          },
        },
      },
    });

    return response.aggregations.body_classes.buckets.map((bucket) => bucket.key);
  } catch (error) {
    console.error('Error fetching body classes:', error);
    throw new Error(`Failed to fetch body classes: ${error.message}`);
  }
}

/**
 * Get distinct data sources for filter dropdown
 * @returns {Array} - Sorted array of data source names
 */
async function getDistinctDataSources() {
  try {
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      aggs: {
        data_sources: {
          terms: {
            field: 'data_source.keyword',
            size: 50,
            order: { _key: 'asc' },
          },
        },
      },
    });

    return response.aggregations.data_sources.buckets.map((bucket) => bucket.key);
  } catch (error) {
    console.error('Error fetching data sources:', error);
    throw new Error(`Failed to fetch data sources: ${error.message}`);
  }
}

/**
 * Get year range for filter dropdown
 * @returns {Object} - {min: number, max: number}
 */
async function getYearRange() {
  try {
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      aggs: {
        year_stats: {
          stats: {
            field: 'year',
          },
        },
      },
    });

    const stats = response.aggregations.year_stats;
    return {
      min: Math.floor(stats.min),
      max: Math.ceil(stats.max),
    };
  } catch (error) {
    console.error('Error fetching year range:', error);
    throw new Error(`Failed to fetch year range: ${error.message}`);
  }
}

module.exports = {
  getManufacturerModelCombinations,
  getVehicleDetails,
  getDistinctManufacturers,
  getDistinctModels,
  getDistinctBodyClasses,
  getDistinctDataSources,
  getYearRange,
};
