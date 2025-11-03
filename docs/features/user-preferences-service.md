# Feature: User Preferences Service

**Status**: Planned
**Priority**: Medium
**Created**: 2025-11-03
**Owner**: TBD

---

## Overview

Per-user preference storage service that persists UI preferences (table column visibility, order, page size, etc.) across browsers and sessions via backend storage.

---

## Current State

### Existing Implementation: TableStatePersistenceService

**File**: `frontend/src/app/shared/services/table-state-persistence.service.ts`

**Storage**: localStorage (browser-specific)

**Limitations**:
- ❌ Per-browser only (not per-user)
- ❌ Lost when switching browsers/devices
- ❌ Lost when clearing browser cache
- ❌ No sharing between team members
- ❌ No backup/restore capability

**What It Stores**:
```typescript
interface TablePreferences {
  columnOrder: string[];       // User's preferred column arrangement
  visibleColumns: string[];    // Which columns are shown/hidden
  pageSize?: number;           // Default rows per page
  lastUpdated?: string;        // Timestamp
}
```

**Storage Key Pattern**: `autos-table-{tableId}-preferences`

---

## Relationship to UrlParamService

### What UrlParamService Handles (URL State)

✅ **Query-related state** (shareable, bookmarkable):
- Selected model combinations (`modelCombos`)
- Active filters (manufacturer, model, year range, body class)
- Current sort column and direction
- Current page number
- Page size

### What User Preferences Service Should Handle (Private UI State)

✅ **User-specific UI preferences** (not shareable):
- Table column visibility (which columns shown/hidden)
- Table column order (user's preferred arrangement)
- Default page size preference (user's preference, not current page size)
- Panel collapse states
- Theme preferences (dark mode, etc.)
- Dashboard layout preferences

### Clear Separation

```
┌─────────────────────────────────────────────────────┐
│                    URL State                        │
│         (via UrlParamService + Router)              │
│                                                     │
│  • Shareable, bookmarkable                         │
│  • Page-specific query state                       │
│  • Example: ?models=Ford:F-150&page=2              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                User Preferences                     │
│         (via UserPreferenceService + Backend)       │
│                                                     │
│  • Private, user-specific                          │
│  • Cross-browser, cross-device                     │
│  • Example: { columnOrder: ['year', 'model', ...] }│
└─────────────────────────────────────────────────────┘
```

**Key Principle**: UrlParamService handles **what** the user is viewing, UserPreferenceService handles **how** the user prefers to view it.

---

## Requirements

### Functional Requirements

1. **User Authentication Integration**
   - Require user login before saving preferences
   - Associate preferences with user account
   - Support guest mode (localStorage fallback)

2. **Preference Scope**
   - Global preferences (apply to all tables)
   - Table-specific preferences (per table ID)
   - Component-specific preferences (per component)

3. **Synchronization**
   - Load preferences on login
   - Save preferences on change (debounced)
   - Sync across browser tabs (BroadcastChannel)
   - Conflict resolution (last-write-wins)

4. **Fallback Behavior**
   - Use localStorage when offline
   - Sync to backend when online
   - Graceful degradation if backend unavailable

5. **Import/Export**
   - Export all preferences as JSON
   - Import preferences from JSON
   - Share preferences with team members

### Non-Functional Requirements

1. **Performance**
   - Load preferences in <100ms
   - Save preferences asynchronously (non-blocking)
   - Cache in memory to reduce API calls

2. **Reliability**
   - Retry failed saves with exponential backoff
   - Validate preferences before saving
   - Handle concurrent updates gracefully

3. **Privacy**
   - User preferences are private by default
   - Optional sharing with team members
   - GDPR compliance (export/delete)

---

## Implementation Checklist

### Phase 1: Backend API (v1.6.0)

- [ ] **Task 1.1**: Design database schema for user preferences
  - [ ] Create `users` table (or integrate with existing auth system)
  - [ ] Create `user_preferences` table
    - Columns: user_id, preference_key, preference_value, updated_at
  - [ ] Add indexes for performance (user_id, preference_key)

- [ ] **Task 1.2**: Implement backend API endpoints
  - [ ] `GET /api/v1/preferences` - Get all preferences for user
  - [ ] `GET /api/v1/preferences/:key` - Get specific preference
  - [ ] `PUT /api/v1/preferences/:key` - Update/create preference
  - [ ] `DELETE /api/v1/preferences/:key` - Delete preference
  - [ ] `POST /api/v1/preferences/bulk` - Bulk update preferences

- [ ] **Task 1.3**: Add authentication middleware
  - [ ] JWT token validation
  - [ ] User identification from token
  - [ ] Return 401 for unauthenticated requests

- [ ] **Task 1.4**: Add validation and error handling
  - [ ] Validate preference keys (allow alphanumeric + dashes)
  - [ ] Validate JSON structure
  - [ ] Limit preference value size (e.g., 10KB per preference)
  - [ ] Rate limiting (prevent abuse)

- [ ] **Task 1.5**: Write backend tests
  - [ ] Unit tests for preference CRUD operations
  - [ ] Integration tests for API endpoints
  - [ ] Test authentication flow

- [ ] **Task 1.6**: Update backend version to v1.6.0
  - [ ] Update package.json version
  - [ ] Build and deploy backend

### Phase 2: Frontend Service (Frontend v1.3.0)

- [ ] **Task 2.1**: Create UserPreferenceService
  - [ ] Injectable service with root providedIn
  - [ ] Methods: get(), set(), delete(), getAll(), bulkUpdate()
  - [ ] In-memory caching (Map<string, any>)
  - [ ] Debounced save (wait 500ms before persisting)
  - [ ] RxJS observables for reactive updates

- [ ] **Task 2.2**: Implement localStorage fallback
  - [ ] Detect online/offline state
  - [ ] Save to localStorage when offline
  - [ ] Sync to backend when online
  - [ ] Merge conflicts (last-write-wins)

- [ ] **Task 2.3**: Add BroadcastChannel for cross-tab sync
  - [ ] Create channel: 'autos-preferences'
  - [ ] Broadcast preference changes to other tabs
  - [ ] Listen for changes from other tabs
  - [ ] Update in-memory cache on remote changes

- [ ] **Task 2.4**: Create PreferenceKeys enum
  - [ ] Define standard keys: TABLE_COLUMN_ORDER, TABLE_COLUMN_VISIBILITY, etc.
  - [ ] Namespace keys by component: `table-{tableId}-columnOrder`
  - [ ] Type-safe key constants

- [ ] **Task 2.5**: Add helper methods
  - [ ] `getTablePreferences(tableId): TablePreferences`
  - [ ] `setTablePreferences(tableId, prefs): void`
  - [ ] `getGlobalPreference<T>(key): T | null`
  - [ ] `setGlobalPreference<T>(key, value): void`

- [ ] **Task 2.6**: Write frontend tests
  - [ ] Unit tests for UserPreferenceService
  - [ ] Mock HTTP requests
  - [ ] Test localStorage fallback
  - [ ] Test BroadcastChannel sync

### Phase 3: Migration from TableStatePersistenceService

- [ ] **Task 3.1**: Update BaseDataTableComponent
  - [ ] Inject UserPreferenceService
  - [ ] Replace TableStatePersistenceService calls
  - [ ] Migrate existing localStorage data to backend
  - [ ] Add migration utility: `migrateTablePreferences()`

- [ ] **Task 3.2**: Update ResultsTableComponent
  - [ ] Replace TableStatePersistenceService with UserPreferenceService
  - [ ] Test column visibility persistence
  - [ ] Test column order persistence

- [ ] **Task 3.3**: Update BasePickerComponent (if applicable)
  - [ ] Check if BasePickerComponent needs preference persistence
  - [ ] Add if needed (e.g., default page size)

- [ ] **Task 3.4**: Deprecate TableStatePersistenceService
  - [ ] Mark as @deprecated in code
  - [ ] Add console warnings
  - [ ] Schedule for removal in v2.0.0

### Phase 4: UI Enhancements

- [ ] **Task 4.1**: Add "Reset to Defaults" button
  - [ ] Add to table column manager
  - [ ] Confirm dialog before reset
  - [ ] Delete user preferences, reload defaults

- [ ] **Task 4.2**: Add preferences export/import UI
  - [ ] Add "Export Preferences" button in settings
  - [ ] Download JSON file
  - [ ] Add "Import Preferences" button
  - [ ] Upload JSON file, validate, apply

- [ ] **Task 4.3**: Add preferences management page
  - [ ] List all saved preferences
  - [ ] Delete individual preferences
  - [ ] Clear all preferences
  - [ ] Show last updated timestamp

### Phase 5: Testing & Deployment

- [ ] **Task 5.1**: End-to-end testing
  - [ ] Test column visibility across browsers
  - [ ] Test column order across browsers
  - [ ] Test preference sync across tabs
  - [ ] Test offline fallback

- [ ] **Task 5.2**: User acceptance testing
  - [ ] Test with real users
  - [ ] Gather feedback
  - [ ] Fix issues

- [ ] **Task 5.3**: Production deployment
  - [ ] Deploy backend v1.6.0
  - [ ] Deploy frontend v1.3.0
  - [ ] Monitor for errors
  - [ ] Roll back if critical issues

- [ ] **Task 5.4**: Documentation
  - [ ] Update CLAUDE.md with new service
  - [ ] Add user guide for preferences
  - [ ] Document migration process

---

## API Design

### Backend Endpoints

#### GET /api/v1/preferences

**Description**: Get all preferences for authenticated user

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "preferences": {
    "table-vehicle-results-columnOrder": ["year", "manufacturer", "model"],
    "table-vehicle-results-visibleColumns": ["year", "manufacturer", "model", "count"],
    "table-vehicle-results-pageSize": 50,
    "theme": "dark"
  }
}
```

#### GET /api/v1/preferences/:key

**Description**: Get specific preference by key

**Authentication**: Required

**Response**:
```json
{
  "key": "table-vehicle-results-columnOrder",
  "value": ["year", "manufacturer", "model"],
  "updatedAt": "2025-11-03T12:34:56Z"
}
```

#### PUT /api/v1/preferences/:key

**Description**: Create or update preference

**Authentication**: Required

**Request Body**:
```json
{
  "value": ["year", "manufacturer", "model"]
}
```

**Response**:
```json
{
  "key": "table-vehicle-results-columnOrder",
  "value": ["year", "manufacturer", "model"],
  "updatedAt": "2025-11-03T12:34:56Z"
}
```

#### DELETE /api/v1/preferences/:key

**Description**: Delete preference

**Authentication**: Required

**Response**:
```json
{
  "deleted": true,
  "key": "table-vehicle-results-columnOrder"
}
```

#### POST /api/v1/preferences/bulk

**Description**: Bulk update multiple preferences

**Authentication**: Required

**Request Body**:
```json
{
  "preferences": {
    "table-vehicle-results-columnOrder": ["year", "manufacturer", "model"],
    "table-vehicle-results-pageSize": 50,
    "theme": "dark"
  }
}
```

**Response**:
```json
{
  "updated": 3,
  "preferences": {
    "table-vehicle-results-columnOrder": ["year", "manufacturer", "model"],
    "table-vehicle-results-pageSize": 50,
    "theme": "dark"
  }
}
```

---

## Frontend Service API

### UserPreferenceService

```typescript
@Injectable({
  providedIn: 'root',
})
export class UserPreferenceService {
  /**
   * Get preference value by key
   * Returns cached value if available, otherwise fetches from backend
   */
  get<T>(key: string): Observable<T | null>;

  /**
   * Set preference value by key
   * Saves to cache immediately, persists to backend after debounce
   */
  set<T>(key: string, value: T): void;

  /**
   * Delete preference by key
   */
  delete(key: string): Observable<void>;

  /**
   * Get all preferences
   */
  getAll(): Observable<Record<string, any>>;

  /**
   * Bulk update preferences
   */
  bulkUpdate(preferences: Record<string, any>): Observable<void>;

  /**
   * Export all preferences as JSON
   */
  export(): string;

  /**
   * Import preferences from JSON
   */
  import(json: string): Observable<void>;

  /**
   * Clear all preferences (requires confirmation)
   */
  clearAll(): Observable<void>;

  /**
   * Get table-specific preferences
   */
  getTablePreferences(tableId: string): TablePreferences | null;

  /**
   * Set table-specific preferences
   */
  setTablePreferences(tableId: string, preferences: TablePreferences): void;
}
```

---

## Migration Plan

### Step 1: Gradual Migration

1. Deploy UserPreferenceService alongside TableStatePersistenceService
2. Components use UserPreferenceService for new preferences
3. Existing localStorage preferences remain functional
4. No breaking changes

### Step 2: Data Migration Utility

```typescript
async migrateTablePreferences(): Promise<void> {
  const localStorageKeys = Object.keys(localStorage)
    .filter(key => key.startsWith('autos-table-'));

  for (const key of localStorageKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      const preferenceKey = key.replace('autos-table-', '');
      await this.userPreferenceService.set(preferenceKey, JSON.parse(value));
    }
  }

  console.log(`Migrated ${localStorageKeys.length} preferences to backend`);
}
```

### Step 3: Deprecation Warning

Add console warnings when TableStatePersistenceService is used:
```typescript
@deprecated('Use UserPreferenceService instead. Will be removed in v2.0.0')
```

### Step 4: Removal (v2.0.0)

- Remove TableStatePersistenceService
- Remove localStorage fallback (backend-only)
- Breaking change: requires backend v1.6.0+

---

## Benefits of UrlParamService Integration

1. **Clear Separation**: UrlParamService handles query state, UserPreferenceService handles UI preferences
2. **No Conflicts**: URL parameters and user preferences live in separate namespaces
3. **Independent Evolution**: Can change preference storage without affecting URL state
4. **Type Safety**: Both services are type-safe and don't interfere with each other

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend unavailable | High | localStorage fallback, offline queue |
| Preference conflicts (multi-tab) | Medium | BroadcastChannel sync, last-write-wins |
| Migration data loss | High | Backup localStorage before migration |
| Performance (many API calls) | Medium | Debounced saves, in-memory caching |
| Authentication required | Medium | Guest mode (localStorage only) |

---

## Success Criteria

- [ ] User can save column visibility across browsers
- [ ] User can save column order across browsers
- [ ] Preferences persist across sessions
- [ ] Preferences sync across tabs in <500ms
- [ ] Backend response time <100ms (cached)
- [ ] Zero data loss during migration
- [ ] 95% test coverage for UserPreferenceService

---

## Related Documentation

- **State Management Guide**: `docs/state-management-guide.md`
- **URL-First Paradigm**: `docs/design/url-first-paradigm-validation.md`
- **UrlParamService**: `frontend/src/app/core/services/url-param.service.ts`
- **TableStatePersistenceService**: `frontend/src/app/shared/services/table-state-persistence.service.ts`

---

## Future Enhancements (v2.0)

- [ ] Preference versioning (track changes over time)
- [ ] Preference templates (save/load named profiles)
- [ ] Team preferences (share with team members)
- [ ] Preference analytics (most used settings)
- [ ] Smart defaults (learn from user behavior)

---

**END OF DOCUMENT**
