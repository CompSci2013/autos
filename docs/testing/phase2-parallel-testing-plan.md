# Phase 2 Parallel Testing Plan

**Created:** 2025-10-28
**Purpose:** Document testing approach for validating generic architecture against legacy implementation
**Status:** Ready for execution

---

## Overview

Phase 2 Steps 5-6 involve parallel testing of the new generic architecture against the existing legacy implementation. This document provides a comprehensive testing plan.

---

## Testing Strategy

### Approach: Side-by-Side Comparison

1. **Feature Flag Toggle**: Use `environment.useGenericArchitecture` to switch implementations
2. **Output Comparison**: Compare results from both implementations
3. **Performance Benchmarking**: Measure response times and bundle sizes
4. **Gradual Rollout**: Enable for development → staging → production

---

## Step 5: Parallel Testing

### Test Scenarios

#### 1. **Basic Data Fetching**

**Test Case 1.1: Single Model Selection**
```typescript
// Test input
filters = {
  selectedItems: [{ path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }],
  page: 1,
  size: 20
};

// Expected: Both implementations return identical results
// Verify: result count, entity fields, ordering
```

**Test Case 1.2: Multiple Model Selections**
```typescript
filters = {
  selectedItems: [
    { path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 },
    { path: ['Chevrolet', 'Corvette'], display: 'Chevrolet Corvette', level: 1 }
  ],
  page: 1,
  size: 20
};
```

**Test Case 1.3: Empty Selection**
```typescript
filters = {
  selectedItems: [],
  page: 1,
  size: 20
};

// Expected: Both return empty results
```

---

#### 2. **Pagination Testing**

**Test Case 2.1: Page Navigation**
```typescript
// Test pages 1-5 with same filters
for (let page = 1; page <= 5; page++) {
  const legacyResults = await testWithFlag(false, { page });
  const genericResults = await testWithFlag(true, { page });

  // Compare: total count, page size, results on each page
  expect(legacyResults).toEqual(genericResults);
}
```

**Test Case 2.2: Page Size Changes**
```typescript
// Test different page sizes
const pageSizes = [10, 20, 50, 100];
for (const size of pageSizes) {
  // Compare results for each page size
}
```

---

#### 3. **Filter Testing**

**Test Case 3.1: Column Filters**
```typescript
filters = {
  selectedItems: [{ path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }],
  columnFilters: {
    bodyClass: 'Pickup',
    dataSource: 'NHTSA'
  },
  page: 1,
  size: 20
};

// Verify: Results match filter criteria
```

**Test Case 3.2: Range Filters**
```typescript
filters = {
  selectedItems: [{ path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }],
  rangeFilters: {
    year: { min: 2015, max: 2020 }
  },
  page: 1,
  size: 20
};

// Verify: All results within year range
```

**Test Case 3.3: Combined Filters**
```typescript
filters = {
  selectedItems: [...],
  columnFilters: { bodyClass: 'Pickup' },
  rangeFilters: { year: { min: 2015, max: 2020 } },
  page: 1,
  size: 20
};

// Verify: Results satisfy all filter conditions
```

---

#### 4. **Sorting Testing**

**Test Case 4.1: Ascending Sort**
```typescript
filters = {
  selectedItems: [...],
  sort: 'year',
  sortDirection: 'asc',
  page: 1,
  size: 20
};

// Verify: Results sorted in ascending order by year
```

**Test Case 4.2: Descending Sort**
```typescript
filters = {
  sort: 'manufacturer',
  sortDirection: 'desc'
};

// Verify: Results sorted in descending order by manufacturer
```

**Test Case 4.3: Multiple Sort Fields**
```typescript
// Test sorting by different columns:
// - manufacturer, model, year, body_class, data_source
```

---

#### 5. **VIN Instances Testing**

**Test Case 5.1: Fetch Instances**
```typescript
const vehicleId = 'test-vehicle-id';
const count = 8;

const legacyInstances = await legacyAdapter.fetchInstances(vehicleId, count);
const genericInstances = await genericAdapter.fetchInstances(vehicleId, count);

// Compare: instance count, VIN format, all fields
```

**Test Case 5.2: Variable Instance Counts**
```typescript
// Test with counts: 1, 5, 8, 10, 20, 100
// Verify: Correct number of instances returned
```

---

#### 6. **Aggregation Testing**

**Test Case 6.1: Manufacturer-Model Counts**
```typescript
const legacyAggs = await legacyAdapter.fetchAggregations();
const genericAggs = await genericAdapter.fetchAggregations();

// Compare: Total count, manufacturer list, model counts per manufacturer
```

---

#### 7. **URL State Management**

**Test Case 7.1: URL Synchronization**
```typescript
// Set filters programmatically
stateService.updateFilters({ selectedItems: [...] });

// Verify: URL updated with correct query params
// Verify: Browser back/forward works correctly
```

**Test Case 7.2: Direct URL Navigation**
```typescript
// Navigate to: http://autos.minilab?selected=Ford:F-150&page=2&size=50
// Verify: State initialized correctly from URL
// Verify: Data fetched automatically
```

**Test Case 7.3: Bookmarking**
```typescript
// Save URL with active filters
// Close browser
// Open bookmark
// Verify: State restored, data loaded
```

---

#### 8. **Caching Testing**

**Test Case 8.1: Request Deduplication**
```typescript
// Make identical requests simultaneously
const promises = [
  stateService.fetchData(),
  stateService.fetchData(),
  stateService.fetchData()
];

await Promise.all(promises);

// Verify: Only 1 HTTP request made
// Verify: All promises resolve with same data
```

**Test Case 8.2: Cache TTL**
```typescript
// Fetch data
// Wait for TTL to expire
// Fetch same data again
// Verify: New HTTP request made after TTL
```

---

### Automated Testing Script

**File**: `scripts/parallel-test.ts`

```typescript
import { environment } from '../environments/environment';

interface TestResult {
  scenario: string;
  legacyOutput: any;
  genericOutput: any;
  match: boolean;
  differences?: string[];
}

async function runParallelTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Basic fetch
  results.push(await testBasicFetch());

  // Test 2: Pagination
  results.push(await testPagination());

  // Test 3: Filters
  results.push(await testFilters());

  // Test 4: Sorting
  results.push(await testSorting());

  // Test 5: Instances
  results.push(await testInstances());

  // Test 6: Aggregations
  results.push(await testAggregations());

  return results;
}

async function testBasicFetch(): Promise<TestResult> {
  const filters = {
    selectedItems: [{ path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }],
    page: 1,
    size: 20
  };

  // Test with legacy
  environment.useGenericArchitecture = false;
  const legacyOutput = await fetchWithFilters(filters);

  // Test with generic
  environment.useGenericArchitecture = true;
  const genericOutput = await fetchWithFilters(filters);

  // Compare
  const match = JSON.stringify(legacyOutput) === JSON.stringify(genericOutput);

  return {
    scenario: 'Basic Fetch',
    legacyOutput,
    genericOutput,
    match,
    differences: match ? undefined : findDifferences(legacyOutput, genericOutput)
  };
}

function findDifferences(obj1: any, obj2: any): string[] {
  const differences: string[] = [];
  // Implementation: Deep comparison logic
  return differences;
}

// Run tests and generate report
runParallelTests().then(results => {
  console.log('=== Parallel Testing Results ===');
  results.forEach(result => {
    console.log(`${result.scenario}: ${result.match ? '✅ PASS' : '❌ FAIL'}`);
    if (!result.match) {
      console.log('Differences:', result.differences);
    }
  });
});
```

---

## Step 6: Integration Testing

### Integration Test Scenarios

#### 1. **Component Integration**

**Discover Page Integration**
```typescript
describe('Discover Page with Generic Architecture', () => {
  it('should load manufacturer-model picker', () => {
    // Verify: Picker loads aggregations
    // Verify: Counts displayed correctly
  });

  it('should update results on selection', () => {
    // Select manufacturer-model
    // Verify: Results table updates
    // Verify: URL updates
  });

  it('should handle pagination', () => {
    // Navigate to page 2
    // Verify: Results update
    // Verify: URL reflects page change
  });
});
```

**Workshop Page Integration**
```typescript
describe('Workshop Page with Generic Architecture', () => {
  it('should support drag-drop layout', () => {
    // Drag panel to new position
    // Verify: Layout persists
  });

  it('should sync state across panels', () => {
    // Change filters in one panel
    // Verify: Other panels update
  });
});
```

---

#### 2. **Service Integration**

**State Management + Data Service**
```typescript
describe('GenericStateManagementService + GenericDataService', () => {
  it('should fetch data on filter update', () => {
    stateService.updateFilters({ selectedItems: [...] });

    // Verify: fetchData called
    // Verify: results$ emits new data
  });

  it('should handle errors gracefully', () => {
    // Trigger API error
    // Verify: error$ emits error message
    // Verify: loading$ set to false
  });
});
```

---

#### 3. **End-to-End Workflows**

**E2E Test 1: Complete User Journey**
```typescript
describe('Complete User Journey', () => {
  it('should complete full workflow', async () => {
    // 1. Load application
    await page.goto('http://autos.minilab');

    // 2. Select manufacturer
    await page.click('[data-test-id="manufacturer-Ford"]');

    // 3. Select model
    await page.click('[data-test-id="model-F-150"]');

    // 4. Verify results appear
    await page.waitForSelector('[data-test-id="results-table"]');
    const rowCount = await page.$$eval('[data-test-id="result-row"]', rows => rows.length);
    expect(rowCount).toBeGreaterThan(0);

    // 5. Apply filter
    await page.selectOption('[data-test-id="filter-bodyClass"]', 'Pickup');

    // 6. Verify filtered results
    await page.waitForSelector('[data-test-id="results-table"]');

    // 7. Change page
    await page.click('[data-test-id="pagination-next"]');

    // 8. Verify URL updated
    expect(page.url()).toContain('page=2');

    // 9. Expand row for VIN instances
    await page.click('[data-test-id="expand-row-0"]');

    // 10. Verify VIN instances displayed
    await page.waitForSelector('[data-test-id="vin-instance"]');
  });
});
```

---

### Performance Benchmarking

**Metrics to Measure:**

1. **Load Time**
   - Initial page load
   - Time to interactive
   - First contentful paint

2. **API Response Times**
   - Average response time
   - 95th percentile
   - 99th percentile

3. **Bundle Size**
   - Legacy implementation
   - Generic implementation
   - Difference

4. **Memory Usage**
   - Peak memory
   - Memory leaks check

**Benchmarking Script:**

```typescript
import { performance } from 'perf_hooks';

async function benchmarkFetch(iterations: number = 100): Promise<BenchmarkResult> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await dataService.fetch(query);
    const end = performance.now();
    times.push(end - start);
  }

  return {
    average: times.reduce((a, b) => a + b) / times.length,
    p95: percentile(times, 0.95),
    p99: percentile(times, 0.99),
    min: Math.min(...times),
    max: Math.max(...times)
  };
}

// Compare legacy vs generic
const legacyBench = await benchmarkFetch(100); // flag = false
const genericBench = await benchmarkFetch(100); // flag = true

console.log('Performance Comparison:');
console.log('Legacy Average:', legacyBench.average, 'ms');
console.log('Generic Average:', genericBench.average, 'ms');
console.log('Difference:', (genericBench.average - legacyBench.average), 'ms');
```

---

## Success Criteria

**Phase 2 Testing Complete When:**

- [ ] All test scenarios pass (100% parity)
- [ ] No regressions detected
- [ ] Performance within 10% of legacy
- [ ] Bundle size increase < 15%
- [ ] Memory usage stable
- [ ] Zero known bugs
- [ ] All edge cases handled
- [ ] Error handling tested
- [ ] Documentation complete

---

## Execution Timeline

**Week 2-3 of Phase 2:**

- **Days 1-2**: Run automated test suite
- **Days 3-4**: Manual testing of edge cases
- **Day 5**: Performance benchmarking
- **Day 6**: Bug fixes
- **Day 7**: Re-test after fixes
- **Day 8**: Final validation
- **Day 9**: Documentation update
- **Day 10**: Team review

---

## Known Risks

1. **API Endpoint Differences**
   - Risk: Generic adapter might call API differently
   - Mitigation: Detailed logging, compare HTTP requests

2. **State Synchronization**
   - Risk: URL parsing differences between implementations
   - Mitigation: Unit test URL parsing separately

3. **Caching Behavior**
   - Risk: Different caching strategies
   - Mitigation: Disable caching for comparison tests

4. **Error Handling**
   - Risk: Different error message formats
   - Mitigation: Normalize error messages before comparison

---

## Next Steps After Testing

Once testing is complete and all criteria met:

1. Update `environment.useGenericArchitecture` to `true` in development
2. Monitor for 1 week
3. Roll out to staging
4. Monitor for 1 week
5. Roll out to production (10% → 50% → 100%)
6. Proceed to Phase 3 (Component Migration)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-28
**Status:** Ready for Execution
