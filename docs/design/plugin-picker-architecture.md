# Plugin-Based Picker Architecture

**Status:** DRAFT (Design Phase)
**Created:** 2025-11-05
**Author:** Claude + Odin
**Version:** 1.0.0

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Current Architecture](#current-architecture)
3. [Proposed Solution](#proposed-solution)
4. [Design Decisions](#design-decisions)
5. [Architecture Changes](#architecture-changes)
6. [Implementation Plan](#implementation-plan)
7. [Examples](#examples)
8. [Migration Path](#migration-path)
9. [Testing Strategy](#testing-strategy)

---

## Problem Statement

### Current Limitation

The existing picker system requires modifications to `ApiService` for every new picker type:

```
Add Engine Picker:
  ├─ Modify ApiService (add getEngines method)
  ├─ Create engine.model.ts
  ├─ Create ENGINE_PICKER_CONFIG
  └─ Register config

Add Sound System Picker:
  ├─ Modify ApiService (add getSoundSystems method)  ❌ REQUIRES CODE CHANGE
  ├─ Create sound-system.model.ts
  ├─ Create SOUND_SYSTEM_PICKER_CONFIG
  └─ Register config
```

**Issues:**
- ApiService becomes a "god object" with methods for every entity type
- Mixing concerns (vehicles, engines, sound systems, wheels, tires, etc.)
- Cannot easily point to external APIs without adding methods to ApiService
- Violates Open/Closed Principle (open for extension, closed for modification)

### Desired State

**True plugin architecture:**

```
Add New Picker:
  ├─ Create picker-config.ts (defines everything)
  └─ Register config

NO changes to ApiService!
NO changes to core framework code!
```

---

## Current Architecture

### Data Flow (Current)

```
PickerConfig
    ↓
    api: {
      method: 'getAllVins',  // Must exist in ApiService
      baseUrl: '...',        // Optional custom base URL
      paramMapper: ...
      responseTransformer: ...
    }
    ↓
BasePickerDataSource
    ↓
    apiService[method](...args, baseUrl?)  // Dynamic method call
    ↓
ApiService.getAllVins(page, size, filters, sortBy, sortOrder, baseUrl?)
    ↓
    HTTP GET /api/vins?page=1&size=20&...
    ↓
Backend API
```

### Constraints

1. **Hard dependency on ApiService** - BasePickerDataSource constructor:
   ```typescript
   constructor(
     private apiService: ApiService,  // Cannot substitute
     private config: PickerConfig<T>
   ) { }
   ```

2. **Method must exist** - `api.method` must match an ApiService method name

3. **Limited to one service** - Cannot use domain-specific services (EngineService, SoundSystemService, etc.)

---

## Proposed Solution

### Enhanced PickerApiConfig Interface

Add **two modes** to `PickerApiConfig`:

**Mode A: ApiService Method (Backward Compatible)**
```typescript
api: {
  method: 'getAllVins',  // Existing approach
  baseUrl: '...',        // Optional
  paramMapper: ...
  responseTransformer: ...
}
```

**Mode B: Direct HTTP (New, Preferred)**
```typescript
api: {
  http: {                      // NEW
    method: 'GET',             // HTTP verb
    endpoint: '/engines',      // Path or full URL
    baseUrl: '...',            // Optional (overrides environment.apiUrl)
    headers: { ... }           // Optional custom headers
  },
  paramMapper: ...
  responseTransformer: ...
}
```

### New Data Flow

```
PickerConfig
    ↓
    api: {
      http: {                        // Direct HTTP config
        method: 'GET',
        endpoint: '/engines',
        baseUrl: 'https://parts-api.com/api'
      },
      paramMapper: ...
      responseTransformer: ...
    }
    ↓
BasePickerDataSource (ENHANCED)
    ↓
    if (config.api.http) {
      makeDirectHttpCall()         // NEW PATH
    } else if (config.api.method) {
      callApiServiceMethod()       // EXISTING PATH
    }
    ↓
HttpClient.get('https://parts-api.com/api/engines?...')
    ↓
External API (or same backend)
```

---

## Design Decisions

### 1. Dual-Mode API Configuration

**Decision:** Support both `api.method` and `api.http` in parallel.

**Rationale:**
- ✅ Backward compatibility (existing pickers unchanged)
- ✅ Gradual migration path
- ✅ Allows mixing old and new approaches
- ❌ Slight complexity in BasePickerDataSource (if/else logic)

**Alternative Considered:** Force all pickers to migrate to `api.http`
- ❌ Breaking change
- ❌ Requires immediate refactor of all existing pickers

### 2. HTTP Configuration Object

**Decision:** Use structured `http` object instead of flat properties.

**Rationale:**
- ✅ Clear distinction between old and new approach
- ✅ Namespace prevents property collisions
- ✅ Easier to validate (check for `api.http` existence)
- ✅ Extensible (can add more HTTP options later)

**Structure:**
```typescript
http: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';  // HTTP verb
  endpoint: string;                            // Path or full URL
  baseUrl?: string;                            // Optional base URL override
  headers?: Record<string, string>;            // Optional custom headers
}
```

### 3. Parameter Mapping

**Decision:** Keep `paramMapper` and `responseTransformer` separate from `http` config.

**Rationale:**
- ✅ Same mapping logic works for both modes
- ✅ Reuse existing patterns
- ✅ Clearer separation of concerns (HTTP config vs data transformation)

### 4. Endpoint Resolution

**Decision:** Support both relative paths and full URLs in `endpoint`.

**Logic:**
```typescript
const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');

const finalUrl = isFullUrl
  ? endpoint                                  // Use as-is
  : `${baseUrl || environment.apiUrl}${endpoint}`;  // Prepend base
```

**Examples:**
```typescript
// Relative path
http: {
  endpoint: '/engines',
  baseUrl: 'https://api.example.com'
}
// Result: https://api.example.com/engines

// Full URL (ignores baseUrl)
http: {
  endpoint: 'https://external-api.com/v2/engines'
}
// Result: https://external-api.com/v2/engines
```

---

## Architecture Changes

### File: `picker-config.model.ts`

**Current:**
```typescript
export interface PickerApiConfig<T = any> {
  baseUrl?: string;
  method: string;
  paramMapper?: (params: TableQueryParams) => any;
  responseTransformer: (response: any) => TableResponse<T>;
}
```

**Proposed:**
```typescript
export interface PickerApiConfig<T = any> {
  /**
   * OPTION A: Use ApiService method (backward compatible)
   * Dynamically calls apiService[method](...args)
   */
  method?: string;

  /**
   * Optional base URL override (works with both modes)
   * Only used if endpoint is relative path
   */
  baseUrl?: string;

  /**
   * OPTION B: Direct HTTP call (new, preferred)
   * Makes HTTP request directly without ApiService
   */
  http?: {
    /** HTTP method */
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';

    /** Endpoint path (relative or full URL) */
    endpoint: string;

    /** Optional custom headers */
    headers?: Record<string, string>;
  };

  /** Transform picker params to API params */
  paramMapper?: (params: TableQueryParams) => any;

  /** Transform API response to TableResponse<T> */
  responseTransformer: (response: any) => TableResponse<T>;
}
```

### File: `base-picker-data-source.ts`

**Changes Required:**

1. **Add HttpClient injection**
   ```typescript
   constructor(
     private apiService: ApiService,
     private config: PickerConfig<T>,
     private http: HttpClient  // NEW
   ) { }
   ```

2. **Add mode detection in callApiMethod()**
   ```typescript
   private callApiMethod(params: TableQueryParams): Observable<TableResponse<T>> {
     // NEW: Direct HTTP mode
     if (this.config.api.http) {
       return this.makeDirectHttpCall(params);
     }

     // EXISTING: ApiService method mode
     if (this.config.api.method) {
       return this.callApiServiceMethod(params);
     }

     throw new Error('[BasePickerDataSource] api.http or api.method must be specified');
   }
   ```

3. **Add makeDirectHttpCall() method**
   ```typescript
   private makeDirectHttpCall(params: TableQueryParams): Observable<TableResponse<T>> {
     const httpConfig = this.config.api.http!;

     // Transform params
     const apiParams = this.config.api.paramMapper
       ? this.config.api.paramMapper(params)
       : params;

     // Build URL
     const endpoint = httpConfig.endpoint;
     const baseUrl = this.config.api.baseUrl || environment.apiUrl;
     const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');
     const url = isFullUrl ? endpoint : `${baseUrl}${endpoint}`;

     // Build HttpParams
     let httpParams = new HttpParams();
     this.flattenParams(apiParams).forEach(([key, value]) => {
       httpParams = httpParams.set(key, value);
     });

     // Build options
     const options = {
       params: httpParams,
       headers: httpConfig.headers || {}
     };

     // Make request
     let request$: Observable<any>;
     switch (httpConfig.method) {
       case 'GET':
         request$ = this.http.get(url, options);
         break;
       case 'POST':
         request$ = this.http.post(url, apiParams, options);
         break;
       case 'PUT':
         request$ = this.http.put(url, apiParams, options);
         break;
       case 'DELETE':
         request$ = this.http.delete(url, options);
         break;
     }

     // Transform response
     return request$.pipe(
       map(response => this.config.api.responseTransformer(response))
     );
   }

   private flattenParams(obj: any, prefix = ''): [string, string][] {
     const result: [string, string][] = [];

     for (const key in obj) {
       if (obj[key] === undefined || obj[key] === null) continue;

       const fullKey = prefix ? `${prefix}.${key}` : key;

       if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
         result.push(...this.flattenParams(obj[key], fullKey));
       } else {
         result.push([fullKey, obj[key].toString()]);
       }
     }

     return result;
   }
   ```

4. **Rename existing method**
   ```typescript
   private callApiServiceMethod(params: TableQueryParams): Observable<TableResponse<T>> {
     // Existing implementation stays the same
     // ... (current code)
   }
   ```

### File: `picker-config.service.ts`

**Update validation logic:**

```typescript
private validateConfig(config: PickerConfig<any>): string[] {
  const errors: string[] = [];

  // ... existing validations ...

  if (!config.api || typeof config.api !== 'object') {
    errors.push('api configuration is required');
  } else {
    // Must have EITHER method OR http
    if (!config.api.method && !config.api.http) {
      errors.push('api.method or api.http must be specified');
    }

    // Validate api.method (if present)
    if (config.api.method !== undefined && typeof config.api.method !== 'string') {
      errors.push('api.method must be a string if provided');
    }

    // Validate api.http (if present)
    if (config.api.http !== undefined) {
      if (typeof config.api.http !== 'object') {
        errors.push('api.http must be an object if provided');
      } else {
        if (!config.api.http.method || !['GET', 'POST', 'PUT', 'DELETE'].includes(config.api.http.method)) {
          errors.push('api.http.method must be GET, POST, PUT, or DELETE');
        }
        if (!config.api.http.endpoint || typeof config.api.http.endpoint !== 'string') {
          errors.push('api.http.endpoint is required and must be a string');
        }
        if (config.api.http.headers !== undefined && typeof config.api.http.headers !== 'object') {
          errors.push('api.http.headers must be an object if provided');
        }
      }
    }

    // Validate baseUrl (optional, works with both modes)
    if (config.api.baseUrl !== undefined && typeof config.api.baseUrl !== 'string') {
      errors.push('api.baseUrl must be a string if provided');
    }

    // ... rest of validations ...
  }

  return errors;
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Backward Compatible)

**Goal:** Add HTTP support without breaking existing pickers.

1. ✅ Update `PickerApiConfig` interface
   - Add `http?` property
   - Make `method?` optional
   - Keep `baseUrl?` (works with both modes)

2. ✅ Update `BasePickerDataSource`
   - Inject `HttpClient`
   - Add `makeDirectHttpCall()` method
   - Add mode detection logic
   - Rename existing method to `callApiServiceMethod()`

3. ✅ Update `PickerConfigService` validation
   - Ensure at least one of `method` or `http` is present
   - Validate `http` structure if provided

4. ✅ Test with existing pickers
   - Verify all existing pickers still work
   - No changes to existing configs required

**Deliverable:** Framework supports both modes, existing pickers unchanged.

### Phase 2: Documentation & Examples

**Goal:** Document new approach and provide examples.

1. ✅ Update CLAUDE.md
   - Add Plugin Picker Architecture section
   - Link to this design document

2. ✅ Create example picker configs
   - `example-engine-picker.config.ts` (demonstration)
   - `example-sound-system-picker.config.ts` (demonstration)

3. ✅ Create migration guide
   - How to convert ApiService-based picker to HTTP-based
   - When to use each approach

**Deliverable:** Clear documentation for developers.

### Phase 3: Real Implementation (Optional)

**Goal:** Add actual Engine and Sound System pickers (requires backend).

1. ⏸ Create backend endpoints
   - GET /api/engines
   - GET /api/sound-systems

2. ⏸ Create picker configs
   - `config/engine-picker.config.ts`
   - `config/sound-system-picker.config.ts`

3. ⏸ Register configs
   - Add to `ALL_PICKER_CONFIGS`

**Deliverable:** Working pickers for customization use case.

### Phase 4: Gradual Migration (Optional)

**Goal:** Migrate existing pickers to HTTP mode (optional).

1. ⏸ Migrate VIN_BROWSER_CONFIG
2. ⏸ Migrate VIN_PICKER_CONFIG
3. ⏸ Migrate MANUFACTURER_MODEL_PICKER_CONFIG

**Note:** Migration is optional. Both modes work indefinitely.

---

## Examples

### Example 1: Engine Picker (HTTP Mode)

**File:** `config/engine-picker.config.ts`

```typescript
import { PickerConfig } from '../shared/models/picker-config.model';

export interface EngineRow {
  id: string;
  manufacturer: string;
  model: string;
  type: string;           // V6, V8, I4, etc.
  displacement: number;   // Liters
  horsepower: number;
  torque: number;         // lb-ft
  price: number;
}

export const ENGINE_PICKER_CONFIG: PickerConfig<EngineRow> = {
  id: 'engine-picker',
  displayName: 'Engine Options',

  columns: [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '20%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'manufacturer',
    },
    {
      key: 'model',
      label: 'Model',
      width: '20%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'model',
    },
    {
      key: 'type',
      label: 'Type',
      width: '15%',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'V6', value: 'V6' },
        { label: 'V8', value: 'V8' },
        { label: 'I4', value: 'I4' },
        { label: 'V12', value: 'V12' },
      ],
      hideable: true,
      valuePath: 'type',
    },
    {
      key: 'horsepower',
      label: 'Horsepower',
      width: '15%',
      sortable: true,
      filterable: true,
      filterType: 'number-range',
      hideable: true,
      valuePath: 'horsepower',
      rangeConfig: {
        min: 0,
        max: 1000,
        step: 50,
        marks: { 0: '0HP', 500: '500HP', 1000: '1000HP' }
      }
    },
    {
      key: 'price',
      label: 'Price',
      width: '15%',
      sortable: true,
      filterable: true,
      filterType: 'number-range',
      hideable: true,
      valuePath: 'price',
      formatter: (value) => `$${value.toLocaleString()}`,
      rangeConfig: {
        min: 0,
        max: 50000,
        step: 1000,
      }
    },
  ],

  api: {
    // === DIRECT HTTP MODE ===
    // No ApiService method needed!
    http: {
      method: 'GET',
      endpoint: '/engines',
      // Optional: Point to external API
      // baseUrl: 'https://parts-api.example.com/api'
    },

    paramMapper: (params) => ({
      page: params.page || 1,
      size: params.size || 20,
      sortBy: params.sortBy || 'manufacturer',
      sortOrder: params.sortOrder || 'asc',
      // Map filters
      manufacturer: params.filters?.['manufacturer'],
      type: params.filters?.['type'],
      horsepowerMin: params.filters?.['horsepowerMin'],
      horsepowerMax: params.filters?.['horsepowerMax'],
      priceMin: params.filters?.['priceMin'],
      priceMax: params.filters?.['priceMax'],
    }),

    responseTransformer: (response: any) => ({
      results: response.data.map((engine: any) => ({
        id: engine.id,
        manufacturer: engine.manufacturer,
        model: engine.model,
        type: engine.type,
        displacement: engine.displacement,
        horsepower: engine.horsepower,
        torque: engine.torque,
        price: engine.price,
      })),
      total: response.total,
      page: response.page,
      size: response.size,
      totalPages: response.totalPages,
    }),
  },

  row: {
    keyGenerator: (row) => row.id,
    keyParser: (key) => ({ id: key }),
  },

  selection: {
    urlParam: 'selectedEngines',
    serializer: (selections) => selections.map(s => s.id).join(','),
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue.split(',').map(id => ({ id } as EngineRow));
    },
  },

  pagination: {
    mode: 'server',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};
```

### Example 2: External API Integration

**File:** `config/weather-picker.config.ts` (Hypothetical)

```typescript
export const WEATHER_PICKER_CONFIG: PickerConfig<WeatherRow> = {
  id: 'weather-picker',
  displayName: 'Weather Data',

  columns: [ /* ... */ ],

  api: {
    // Point to completely external API
    http: {
      method: 'GET',
      endpoint: 'https://api.weatherapi.com/v1/search',
      headers: {
        'X-API-Key': 'your-api-key-here',  // Custom auth
      }
    },

    paramMapper: (params) => ({
      q: params.filters?.['city'],
      days: params.size || 7,
    }),

    responseTransformer: (response: any) => ({
      results: response.forecast.forecastday.map((day: any) => ({
        date: day.date,
        temp: day.day.avgtemp_f,
        condition: day.day.condition.text,
      })),
      total: response.forecast.forecastday.length,
      page: 1,
      size: response.forecast.forecastday.length,
      totalPages: 1,
    }),
  },

  row: { /* ... */ },
  selection: { /* ... */ },
  pagination: { mode: 'client', /* ... */ },
};
```

### Example 3: Backward Compatible (ApiService Mode)

**Existing pickers continue to work unchanged:**

```typescript
export const VIN_BROWSER_CONFIG: PickerConfig<VinPickerRow> = {
  id: 'vin-browser',
  displayName: 'VIN Browser',

  columns: [ /* ... */ ],

  api: {
    // OLD MODE: Uses ApiService.getAllVins() method
    method: 'getAllVins',  // Still works!
    paramMapper: (params) => { /* ... */ },
    responseTransformer: (response) => { /* ... */ },
  },

  // ... rest of config
};
```

---

## Migration Path

### Converting ApiService-Based to HTTP-Based

**Before (ApiService mode):**
```typescript
api: {
  method: 'getAllVins',
  paramMapper: (params) => ({ /* ... */ }),
  responseTransformer: (response) => ({ /* ... */ }),
}
```

**After (HTTP mode):**
```typescript
api: {
  http: {
    method: 'GET',
    endpoint: '/vins',
  },
  paramMapper: (params) => ({ /* ... */ }),  // Same
  responseTransformer: (response) => ({ /* ... */ }),  // Same
}
```

### Migration Steps

1. **Identify endpoint** - Check ApiService method to find endpoint path
   ```typescript
   // ApiService method:
   getAllVins(...): Observable<any> {
     return this.http.get<any>(`${this.apiUrl}/vins`, { params });
   }
   // Endpoint: '/vins'
   ```

2. **Determine HTTP method** - Usually GET for pickers

3. **Update config** - Replace `method` with `http` object

4. **Test** - Verify picker works identically

5. **Optional: Remove ApiService method** - If no other code uses it

---

## Testing Strategy

### Unit Tests

**File:** `base-picker-data-source.spec.ts`

```typescript
describe('BasePickerDataSource', () => {
  describe('HTTP Mode', () => {
    it('should make direct HTTP call when api.http is configured', () => {
      // Test HTTP mode
    });

    it('should build URL from baseUrl + endpoint', () => {
      // Test URL construction
    });

    it('should use full URL when endpoint starts with http', () => {
      // Test full URL handling
    });

    it('should include custom headers in request', () => {
      // Test header passing
    });

    it('should flatten nested params correctly', () => {
      // Test param flattening
    });
  });

  describe('ApiService Mode (Backward Compatibility)', () => {
    it('should call ApiService method when api.method is configured', () => {
      // Test existing mode
    });
  });

  describe('Error Handling', () => {
    it('should throw error if neither http nor method is configured', () => {
      // Test validation
    });
  });
});
```

### Integration Tests

**File:** `picker-config.integration.spec.ts`

```typescript
describe('Picker Configuration Integration', () => {
  it('should load and validate all registered picker configs', () => {
    // Test config registration
  });

  it('should support both HTTP and ApiService modes simultaneously', () => {
    // Test mixed mode support
  });
});
```

### Manual Testing Checklist

- [ ] VIN Browser (ApiService mode) - Verify still works
- [ ] Manufacturer-Model Picker (ApiService mode) - Verify still works
- [ ] Engine Picker (HTTP mode) - Verify new mode works
- [ ] Sound System Picker (HTTP mode) - Verify new mode works
- [ ] External API Picker (HTTP mode with full URL) - Verify external API works
- [ ] Custom headers - Verify headers passed correctly
- [ ] Error handling - Verify graceful error messages

---

## Benefits Summary

### For Developers

✅ **Add pickers without touching core code** - Just create config file
✅ **Point to any API** - Internal, external, microservices
✅ **Cleaner separation** - Each picker is self-contained
✅ **Less coupling** - No dependency on ApiService
✅ **Easier testing** - Mock HTTP calls instead of ApiService

### For Architecture

✅ **Open/Closed Principle** - Open for extension, closed for modification
✅ **Plugin-based** - True plugin architecture
✅ **Backward compatible** - Existing pickers unchanged
✅ **Scalable** - Add unlimited pickers without bloating ApiService
✅ **Flexible** - Support multiple API sources

---

## Future Enhancements

### Possible Extensions

1. **GraphQL Support**
   ```typescript
   api: {
     graphql: {
       endpoint: '/graphql',
       query: `query GetEngines($filters: EngineFilters) { ... }`,
       variables: (params) => ({ filters: params.filters })
     }
   }
   ```

2. **WebSocket Support**
   ```typescript
   api: {
     websocket: {
       endpoint: 'wss://realtime-api.com/engines',
       messageFormat: 'json'
     }
   }
   ```

3. **Request Interceptors**
   ```typescript
   api: {
     http: { /* ... */ },
     interceptors: {
       request: (req) => { /* modify request */ },
       response: (res) => { /* modify response */ }
     }
   }
   ```

4. **Authentication Strategies**
   ```typescript
   api: {
     http: { /* ... */ },
     auth: {
       type: 'bearer',
       tokenProvider: () => authService.getToken()
     }
   }
   ```

---

## Risks & Mitigation

### Risk 1: Complexity in BasePickerDataSource

**Risk:** Adding HTTP mode increases complexity of BasePickerDataSource.

**Mitigation:**
- Clear separation of concerns (two private methods)
- Extensive unit tests
- Good documentation

### Risk 2: Parameter Flattening Issues

**Risk:** Flattening nested objects for query params might cause issues.

**Mitigation:**
- Use established pattern (dotted notation: `filters.manufacturer`)
- Provide helper for custom param serialization
- Test with complex nested structures

### Risk 3: Breaking Changes in Future

**Risk:** Future HTTP library changes might break direct HTTP calls.

**Mitigation:**
- Abstract HTTP calls behind interface
- Easy to swap HttpClient for alternative
- Version lock critical dependencies

---

## Changelog

### v1.0.0 (2025-11-05)

- Initial design document
- Defined dual-mode architecture (ApiService + HTTP)
- Outlined implementation plan
- Created examples for Engine and Sound System pickers

---

**END OF DESIGN DOCUMENT**

This document should be read in conjunction with:
- [CLAUDE.md](../../CLAUDE.md) - Main application reference
- [Milestone 003 - Base Table Design](milestone-003-base-table-design.md) - Table architecture
- [State Management Guide](../state-management-guide.md) - State patterns
