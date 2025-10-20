# BaseDataTable Testing & Filter Fix Plan

**Date:** 2025-10-19  
**Priority:** HIGH  
**Status:** Ready for Next Session  
**Goals:** Fix broken filters + Implement regression testing

---

## Session Objectives

1. ✅ **Fix broken filters** in BaseDataTableComponent
2. ✅ **Write comprehensive tests** as we fix
3. ✅ **Establish regression testing workflow** for future commits
4. ✅ **Document testing patterns** for team

---

## Current Issues

### Filters are Broken

**Symptoms:**
- Typing in filter inputs doesn't filter data
- Filter values may not persist
- Filter state may not sync with URL
- Unclear which specific filter functionality is broken

**Need to Investigate:**
- [ ] Are filters being emitted from BaseDataTable?
- [ ] Is the data source receiving filter parameters?
- [ ] Is the backend API receiving filter parameters?
- [ ] Is the URL being updated with filter values?
- [ ] Do filters work in table-picker (client-side)?
- [ ] Do filters work in results-table (server-side)?

---

## Testing Strategy

### Test Pyramid Approach

```
         /\
        /  \  E2E Tests (Few)
       /────\
      /      \  Integration Tests (Some)
     /────────\
    /          \  Unit Tests (Many)
   /────────────\
```

**Focus for this session:**
1. **Unit Tests** - Component logic, pure functions
2. **Integration Tests** - Component + Service interactions
3. **E2E Tests** - (Optional) Full user workflows

---

## Test Coverage Goals

### BaseDataTableComponent

#### Core Functionality (Must Test)
- [ ] **Column Management**
  - Display columns correctly
  - Hide/show columns
  - Reorder columns (drag-drop)
  - Persist column preferences
  
- [ ] **Filtering** ⚠️ **BROKEN - PRIMARY FOCUS**
  - Text filter input
  - Filter debouncing (400ms)
  - Filter emission to parent
  - Filter persistence in URL
  - Clear filters
  
- [ ] **Sorting**
  - Sort ascending
  - Sort descending
  - Clear sort
  - Sort emission to parent
  
- [ ] **Pagination**
  - Page navigation
  - Page size changes
  - Total count display
  - Pagination controls
  
- [ ] **Data Fetching**
  - Initial load
  - Fetch on parameter changes
  - Deep equality check (performance fix)
  - Loading states
  
- [ ] **Row Expansion** (if applicable)
  - Expand/collapse rows
  - Lazy load expansion content
  - Multiple expansions

#### Edge Cases (Should Test)
- [ ] Empty data
- [ ] Single row
- [ ] Large datasets (1000+ rows)
- [ ] Very long column values
- [ ] Missing/null values
- [ ] Rapid user interactions
- [ ] Browser back/forward navigation

---

## Test File Structure

### Proposed Organization

```
src/app/shared/components/base-data-table/
├── base-data-table.component.ts
├── base-data-table.component.html
├── base-data-table.component.scss
├── base-data-table.component.spec.ts          # Main test file
├── tests/
│   ├── base-data-table.unit.spec.ts          # Unit tests
│   ├── base-data-table.integration.spec.ts   # Integration tests
│   ├── base-data-table.filtering.spec.ts     # Filter-specific tests
│   ├── base-data-table.performance.spec.ts   # Performance tests
│   └── test-helpers.ts                       # Shared test utilities
└── mocks/
    ├── mock-data-source.ts
    └── mock-table-data.ts
```

---

## Test Implementation Plan

### Phase 1: Setup & Infrastructure (30 min)

**Tasks:**
1. Create test file structure
2. Set up test utilities and mocks
3. Configure TestBed
4. Create mock data source
5. Create sample test data

**Deliverables:**
```typescript
// tests/test-helpers.ts
export class MockTableDataSource<T> implements TableDataSource<T> {
  fetch(params: TableQueryParams): Observable<TableResponse<T>> {
    // Mock implementation
  }
}

// tests/mock-table-data.ts
export const MOCK_VEHICLE_DATA: VehicleResult[] = [
  { vehicle_id: '1', manufacturer: 'Ford', model: 'F-150', year: 2020, ... },
  { vehicle_id: '2', manufacturer: 'Chevy', model: 'Silverado', year: 2021, ... },
  // ... more test data
];
```

---

### Phase 2: Fix & Test Filters (60-90 min)

#### Step 1: Diagnose Filter Issues

**Investigation Checklist:**
```typescript
// 1. Check filter input binding
// In base-data-table.component.html
<input nz-input [(ngModel)]="filters[column.key]" />

// 2. Check filter subject setup
// In base-data-table.component.ts
private filterSubject$ = new Subject<void>();

// 3. Check debouncing
this.filterSubject$.pipe(
  debounceTime(400),
  distinctUntilChanged(),
  takeUntil(this.destroy$)
).subscribe(() => {
  this.currentPage = 1;
  this.fetchData();
});

// 4. Check filter emission
this.queryParamsChange.emit({
  page: this.currentPage,
  size: this.pageSize,
  filters: this.filters  // Are filters included?
});
```

#### Step 2: Write Failing Tests

```typescript
// tests/base-data-table.filtering.spec.ts
describe('BaseDataTableComponent - Filtering', () => {
  
  it('should emit filter changes when user types in filter input', fakeAsync(() => {
    // Arrange
    const filterSpy = jasmine.createSpy('filterChange');
    component.queryParamsChange.subscribe(filterSpy);
    
    // Act
    component.filters['manufacturer'] = 'Ford';
    component.onFilterChange('manufacturer');
    tick(400); // Wait for debounce
    
    // Assert
    expect(filterSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        filters: { manufacturer: 'Ford' }
      })
    );
  }));
  
  it('should debounce filter input (400ms)', fakeAsync(() => {
    const fetchSpy = spyOn(component, 'fetchData');
    
    // Type rapidly
    component.filters['manufacturer'] = 'F';
    component.onFilterChange('manufacturer');
    tick(100);
    
    component.filters['manufacturer'] = 'Fo';
    component.onFilterChange('manufacturer');
    tick(100);
    
    component.filters['manufacturer'] = 'For';
    component.onFilterChange('manufacturer');
    tick(100);
    
    component.filters['manufacturer'] = 'Ford';
    component.onFilterChange('manufacturer');
    tick(400);
    
    // Should only fetch once after debounce
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  }));
  
  it('should reset to page 1 when filter changes', fakeAsync(() => {
    component.currentPage = 5;
    
    component.filters['manufacturer'] = 'Ford';
    component.onFilterChange('manufacturer');
    tick(400);
    
    expect(component.currentPage).toBe(1);
  }));
  
  it('should pass filters to data source', fakeAsync(() => {
    const dataSourceSpy = spyOn(component.dataSource, 'fetch').and.returnValue(
      of({ results: [], total: 0, page: 1, size: 20, totalPages: 0 })
    );
    
    component.filters['manufacturer'] = 'Ford';
    component.onFilterChange('manufacturer');
    tick(400);
    
    expect(dataSourceSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        filters: { manufacturer: 'Ford' }
      })
    );
  }));
  
  it('should clear filters when clear button clicked', () => {
    component.filters = { manufacturer: 'Ford', model: 'F-150' };
    
    component.clearFilters();
    
    expect(component.filters).toEqual({});
  });
});
```

#### Step 3: Fix Implementation

Based on failing tests, fix the implementation:

**Common Issues to Check:**
1. Missing `onFilterChange()` method trigger
2. Filter subject not properly connected
3. Filters not included in `queryParamsChange` emission
4. Debouncing not working
5. Page reset not happening

#### Step 4: Verify Tests Pass

```bash
ng test --include='**/base-data-table.filtering.spec.ts'
```

---

### Phase 3: Test Other Core Features (60 min)

#### Sorting Tests

```typescript
describe('BaseDataTableComponent - Sorting', () => {
  it('should sort ascending when column header clicked', () => {
    component.onSort({ key: 'year' } as TableColumn<VehicleResult>);
    
    expect(component.sortBy).toBe('year');
    expect(component.sortOrder).toBe('asc');
  });
  
  it('should toggle to descending on second click', () => {
    component.sortBy = 'year';
    component.sortOrder = 'asc';
    
    component.onSort({ key: 'year' } as TableColumn<VehicleResult>);
    
    expect(component.sortOrder).toBe('desc');
  });
  
  it('should clear sort on third click', () => {
    component.sortBy = 'year';
    component.sortOrder = 'desc';
    
    component.onSort({ key: 'year' } as TableColumn<VehicleResult>);
    
    expect(component.sortBy).toBeUndefined();
    expect(component.sortOrder).toBeUndefined();
  });
});
```

#### Pagination Tests

```typescript
describe('BaseDataTableComponent - Pagination', () => {
  it('should change page when page button clicked', () => {
    const fetchSpy = spyOn(component, 'fetchData');
    
    component.onPageChange(2);
    
    expect(component.currentPage).toBe(2);
    expect(fetchSpy).toHaveBeenCalled();
  });
  
  it('should change page size and reset to page 1', () => {
    component.currentPage = 5;
    
    component.onPageSizeChange(50);
    
    expect(component.pageSize).toBe(50);
    expect(component.currentPage).toBe(1);
  });
});
```

#### Deep Equality Tests (Performance Fix)

```typescript
describe('BaseDataTableComponent - Performance', () => {
  it('should NOT fetch data when queryParams reference changes but content is same', () => {
    const fetchSpy = spyOn(component, 'fetchData');
    
    const params1 = { page: 1, size: 20, filters: { manufacturer: 'Ford' } };
    const params2 = { page: 1, size: 20, filters: { manufacturer: 'Ford' } };
    
    component.queryParams = params1;
    component.ngOnChanges({
      queryParams: new SimpleChange(null, params1, true)
    });
    
    fetchSpy.calls.reset();
    
    // New object, same content
    component.queryParams = params2;
    component.ngOnChanges({
      queryParams: new SimpleChange(params1, params2, false)
    });
    
    // Should NOT call fetchData due to deep equality check
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  
  it('should fetch data when queryParams actually change', () => {
    const fetchSpy = spyOn(component, 'fetchData');
    
    const params1 = { page: 1, size: 20, filters: {} };
    const params2 = { page: 2, size: 20, filters: {} };
    
    component.queryParams = params1;
    component.ngOnChanges({
      queryParams: new SimpleChange(null, params1, true)
    });
    
    fetchSpy.calls.reset();
    
    component.queryParams = params2;
    component.ngOnChanges({
      queryParams: new SimpleChange(params1, params2, false)
    });
    
    expect(fetchSpy).toHaveBeenCalled();
  });
});
```

---

### Phase 4: Integration Tests (30 min)

```typescript
describe('BaseDataTableComponent - Integration', () => {
  it('should complete full filter workflow', fakeAsync(() => {
    // User types in filter
    const input = fixture.debugElement.query(By.css('input[data-filter="manufacturer"]'));
    input.nativeElement.value = 'Ford';
    input.nativeElement.dispatchEvent(new Event('input'));
    
    tick(400); // Debounce
    fixture.detectChanges();
    
    // Verify table updates
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    rows.forEach(row => {
      const manufacturerCell = row.query(By.css('[data-column="manufacturer"]'));
      expect(manufacturerCell.nativeElement.textContent).toContain('Ford');
    });
  }));
  
  it('should persist filters in localStorage', () => {
    component.tableId = 'test-table';
    component.filters = { manufacturer: 'Ford' };
    
    component.savePreferences();
    
    const saved = localStorage.getItem('autos-table-test-table-preferences');
    expect(saved).toBeTruthy();
    
    const prefs = JSON.parse(saved!);
    // Note: Filters are NOT persisted, only column prefs
    // Filters come from URL
  });
});
```

---

## Regression Testing Workflow

### Git Hooks Setup

**Pre-commit Hook (Run Fast Tests)**

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running unit tests..."
npm run test:unit -- --watch=false --browsers=ChromeHeadless

if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed. Commit aborted."
  exit 1
fi

echo "✅ Unit tests passed"
```

**Pre-push Hook (Run All Tests)**

```bash
# .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running all tests..."
npm run test:all -- --watch=false --browsers=ChromeHeadless

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Push aborted."
  exit 1
fi

echo "✅ All tests passed"
```

### NPM Scripts

```json
{
  "scripts": {
    "test": "ng test",
    "test:unit": "ng test --include='**/*.unit.spec.ts'",
    "test:integration": "ng test --include='**/*.integration.spec.ts'",
    "test:all": "ng test --watch=false --code-coverage",
    "test:watch": "ng test --watch=true",
    "test:coverage": "ng test --watch=false --code-coverage",
    "test:debug": "ng test --browsers=Chrome --watch=true"
  }
}
```

### CI/CD Integration (Future)

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '14'
      - run: npm ci
      - run: npm run test:all
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## Test Coverage Targets

### Minimum Acceptable Coverage

| Metric | Target | Critical Components |
|--------|--------|---------------------|
| **Line Coverage** | 80% | BaseDataTable: 90% |
| **Branch Coverage** | 75% | Filter logic: 90% |
| **Function Coverage** | 85% | Public methods: 100% |
| **Statement Coverage** | 80% | Core paths: 95% |

### Coverage Report

```bash
# Generate coverage report
ng test --watch=false --code-coverage

# View report
open coverage/index.html
```

---

## Testing Best Practices

### DO ✅

1. **Test behavior, not implementation**
   ```typescript
   // ✅ GOOD - Tests behavior
   it('should filter results when user types in search', () => {
     component.onFilterChange('Ford');
     expect(component.filteredResults).toContain(fordVehicle);
   });
   
   // ❌ BAD - Tests implementation
   it('should call filterSubject.next()', () => {
     spyOn(component['filterSubject$'], 'next');
     component.onFilterChange('Ford');
     expect(component['filterSubject$'].next).toHaveBeenCalled();
   });
   ```

2. **Use descriptive test names**
   ```typescript
   // ✅ GOOD
   it('should reset to page 1 when filter changes')
   
   // ❌ BAD
   it('should work')
   ```

3. **Arrange-Act-Assert pattern**
   ```typescript
   it('should do something', () => {
     // Arrange - Set up test data
     const input = 'Ford';
     
     // Act - Perform action
     component.filter(input);
     
     // Assert - Verify outcome
     expect(component.results.length).toBe(5);
   });
   ```

4. **Test one thing per test**
5. **Use fakeAsync/tick for timing**
6. **Clean up after tests**
7. **Mock external dependencies**

### DON'T ❌

1. **Don't test framework code**
2. **Don't test private methods directly**
3. **Don't use real HTTP calls**
4. **Don't depend on test execution order**
5. **Don't ignore flaky tests**
6. **Don't skip edge cases**

---

## Session Checklist

### Before Starting
- [ ] Review BaseDataTable implementation
- [ ] Identify specific filter issues
- [ ] Set up test environment
- [ ] Create mock data

### During Session
- [ ] Write failing test for filter bug
- [ ] Fix implementation
- [ ] Verify test passes
- [ ] Write tests for related functionality
- [ ] Achieve target coverage
- [ ] Document findings

### After Session
- [ ] Commit tests with fixes
- [ ] Update documentation
- [ ] Set up git hooks
- [ ] Configure CI/CD (if applicable)
- [ ] Share testing patterns with team

---

## Known Issues to Test

### Filter-Related Issues

1. **Filters may not be emitting**
   - Check `queryParamsChange` emission
   - Verify filters object is included

2. **Debouncing may not work**
   - Verify Subject setup
   - Check subscription lifecycle

3. **Filters may not persist**
   - Filters should be in URL (not localStorage)
   - Check StateManagementService integration

4. **Client vs Server filtering**
   - Table-picker: client-side filtering
   - Results-table: server-side filtering
   - Different code paths to test

---

## Success Criteria

### Definition of Done

- [ ] All filter functionality works correctly
- [ ] Comprehensive test suite written
- [ ] Test coverage meets targets (80%+)
- [ ] Tests run on every commit
- [ ] Documentation updated
- [ ] Team can follow testing patterns
- [ ] No regression in existing features

---

## Resources

### Angular Testing
- [Angular Testing Guide](https://angular.io/guide/testing)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Karma Configuration](https://karma-runner.github.io/)

### Testing Patterns
- `tests/test-helpers.ts` - Shared utilities
- `tests/mock-table-data.ts` - Sample data
- Existing spec files for patterns

### Tools
- **Karma** - Test runner
- **Jasmine** - Testing framework
- **Chrome Headless** - Browser for CI/CD
- **Istanbul** - Coverage reporting

---

**Next Session: Fix filters, write tests, establish regression testing workflow**

**Estimated Time:** 3-4 hours

**Priority:** HIGH - Foundation for quality codebase
