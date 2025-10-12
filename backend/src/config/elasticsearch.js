const { Client } = require('@elastic/elasticsearch');

// Use K8s internal DNS in production, NodePort for local dev
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch.data.svc.cluster.local:9200';
const ELASTICSEARCH_INDEX = process.env.ELASTICSEARCH_INDEX || 'autos-unified';

// Create Elasticsearch client
const esClient = new Client({
  node: ELASTICSEARCH_URL,
  requestTimeout: 30000,
  maxRetries: 3
});

// Test connection on startup
async function testConnection() {
  try {
    const health = await esClient.cluster.health();
    console.log('✓ Elasticsearch connection successful');
    console.log(`  Cluster: ${health.cluster_name}, Status: ${health.status}`);
    
    // Check if index exists
    const indexExists = await esClient.indices.exists({ index: ELASTICSEARCH_INDEX });
    if (indexExists) {
      const count = await esClient.count({ index: ELASTICSEARCH_INDEX });
      console.log(`✓ Index '${ELASTICSEARCH_INDEX}' found with ${count.count} documents`);
    } else {
      console.warn(`⚠ Index '${ELASTICSEARCH_INDEX}' does not exist`);
    }
  } catch (error) {
    console.error('✗ Elasticsearch connection failed:', error.message);
    throw error;
  }
}

module.exports = {
  esClient,
  ELASTICSEARCH_INDEX,
  testConnection
};
