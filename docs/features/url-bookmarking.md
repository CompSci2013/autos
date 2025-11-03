# Feature: URL Bookmarking Service

**Status**: Planned
**Priority**: High
**Created**: 2025-11-03
**Owner**: TBD

---

## Overview

Allow users to save the current application URL with a friendly name, browse saved bookmarks, and quickly restore saved searches. Includes copy-to-clipboard and delete functionality.

---

## Current State

### Existing Capability

✅ **URL-First Architecture**: All query state already lives in URLs
- URLs are shareable and bookmarkable via browser
- Users can manually bookmark pages
- URLs survive page refresh

❌ **No In-App Bookmark Management**:
- No UI for saving URLs with custom names
- No way to browse saved searches within the app
- No organized bookmark library
- Users must rely on browser bookmarks (not app-integrated)

---

## Relationship to UrlParamService

### Perfect Integration Opportunity

UrlParamService provides the foundation for this feature:

```typescript
// Capture current URL state
const currentUrl = window.location.href;
// OR
const currentParams = this.urlParamService.getAllParams();

// Save bookmark
const bookmark = {
  name: "1960s Ford Mustangs",
  url: currentUrl,
  params: currentParams,  // Structured representation
  createdAt: new Date()
};

// Later: Restore bookmark
window.location.href = bookmark.url;
// OR
this.urlParamService.setParams(bookmark.params);
```

**Benefits**:
1. ✅ UrlParamService already captures all state in URL
2. ✅ URL is guaranteed to be valid and complete
3. ✅ No need to manually track which parameters to save
4. ✅ Bookmarks work across all pages (Discover, Workshop, etc.)

---

## Requirements

### Functional Requirements

1. **Save Current URL**
   - Capture full current URL
   - User provides friendly name
   - Store creation timestamp
   - Optional: Add tags/categories
   - Optional: Add notes/description

2. **Browse Bookmarks**
   - List all saved bookmarks
   - Sort by: name, date created, last used
   - Filter by: tags, search text
   - Group by: category, date range

3. **Bookmark Actions**
   - **Navigate**: Click to load bookmark (navigate to URL)
   - **Copy**: Copy URL to clipboard
   - **Edit**: Change friendly name, tags, notes
   - **Delete**: Remove bookmark (with confirmation)
   - **Share**: Generate shareable link (optional)

4. **Quick Access**
   - Bookmark sidebar/drawer (collapsed by default)
   - Keyboard shortcut: Ctrl+B to open bookmark panel
   - Keyboard shortcut: Ctrl+D to save current URL
   - Recent bookmarks (last 5) for quick access

5. **Persistence**
   - Store bookmarks per user (backend)
   - Fallback to localStorage for guest users
   - Sync across devices/browsers

### Non-Functional Requirements

1. **Performance**
   - Load bookmarks in <200ms
   - Save bookmark instantly (optimistic UI)
   - Search/filter bookmarks in <100ms

2. **Usability**
   - Simple, intuitive UI
   - One-click save (with default name)
   - Quick access from any page
   - Mobile-responsive

3. **Data Integrity**
   - Validate URLs before saving
   - Handle parameter changes gracefully
   - Prevent duplicate bookmarks (same URL + name)

---

## Implementation Checklist

### Phase 1: Backend API (v1.6.0)

- [ ] **Task 1.1**: Design database schema
  - [ ] Create `bookmarks` table
    - Columns: id, user_id, name, url, params_json, tags, notes, created_at, last_used_at, use_count
  - [ ] Add indexes: (user_id, name), (user_id, created_at)

- [ ] **Task 1.2**: Implement backend API endpoints
  - [ ] `GET /api/v1/bookmarks` - List all bookmarks for user
    - Query params: sort, filter, limit, offset
  - [ ] `POST /api/v1/bookmarks` - Create bookmark
  - [ ] `GET /api/v1/bookmarks/:id` - Get bookmark by ID
  - [ ] `PUT /api/v1/bookmarks/:id` - Update bookmark
  - [ ] `DELETE /api/v1/bookmarks/:id` - Delete bookmark
  - [ ] `POST /api/v1/bookmarks/:id/track-usage` - Track usage (increment count)

- [ ] **Task 1.3**: Add validation
  - [ ] Validate URL format
  - [ ] Validate name length (max 100 chars)
  - [ ] Validate tags (max 10 tags, 20 chars each)
  - [ ] Prevent duplicate name+URL combinations

- [ ] **Task 1.4**: Add authentication middleware
  - [ ] JWT token validation
  - [ ] User identification
  - [ ] Guest mode support (optional)

- [ ] **Task 1.5**: Write backend tests
  - [ ] Unit tests for bookmark CRUD
  - [ ] Integration tests for API endpoints
  - [ ] Test duplicate prevention

- [ ] **Task 1.6**: Update backend version to v1.6.0

### Phase 2: Frontend Service (Frontend v1.3.0)

- [ ] **Task 2.1**: Create BookmarkService
  - [ ] Injectable service with root providedIn
  - [ ] Methods: list(), create(), update(), delete(), trackUsage()
  - [ ] In-memory caching (Map<id, Bookmark>)
  - [ ] RxJS observables for reactive updates

- [ ] **Task 2.2**: Integrate with UrlParamService
  - [ ] Capture current URL: `window.location.href`
  - [ ] Capture current params: `urlParamService.getAllParams()`
  - [ ] Restore bookmark: `urlParamService.setParams(params)`

- [ ] **Task 2.3**: Add localStorage fallback for guests
  - [ ] Detect guest mode (no auth token)
  - [ ] Save bookmarks to localStorage: `autos-bookmarks`
  - [ ] Migrate to backend on login

- [ ] **Task 2.4**: Create Bookmark model
  ```typescript
  interface Bookmark {
    id: string;
    name: string;
    url: string;
    params: Record<string, string>;  // Structured params
    tags?: string[];
    notes?: string;
    createdAt: Date;
    lastUsedAt?: Date;
    useCount: number;
  }
  ```

- [ ] **Task 2.5**: Add helper methods
  - [ ] `captureCurrentUrl(): Bookmark` - Create bookmark from current state
  - [ ] `restoreBookmark(bookmark: Bookmark): void` - Navigate to bookmark
  - [ ] `copyToClipboard(bookmark: Bookmark): void` - Copy URL to clipboard
  - [ ] `getRecentBookmarks(limit: number): Bookmark[]` - Last N used

- [ ] **Task 2.6**: Write frontend tests
  - [ ] Unit tests for BookmarkService
  - [ ] Mock HTTP requests
  - [ ] Test localStorage fallback
  - [ ] Test UrlParamService integration

### Phase 3: UI Components

- [ ] **Task 3.1**: Create BookmarkManagerComponent
  - [ ] List view with all bookmarks
  - [ ] Search/filter input
  - [ ] Sort dropdown (name, date, last used)
  - [ ] Actions per bookmark: navigate, copy, edit, delete
  - [ ] Empty state: "No bookmarks yet"

- [ ] **Task 3.2**: Create BookmarkSaveDialogComponent
  - [ ] Modal dialog for saving bookmark
  - [ ] Auto-generated name (from URL params or current view)
  - [ ] Editable name field
  - [ ] Optional tags field (comma-separated)
  - [ ] Optional notes textarea
  - [ ] Preview of URL being saved
  - [ ] Save/Cancel buttons

- [ ] **Task 3.3**: Create BookmarkSidebarComponent
  - [ ] Collapsible sidebar (right side)
  - [ ] Quick save button at top
  - [ ] Recent bookmarks (last 5)
  - [ ] "View All" button to open BookmarkManagerComponent

- [ ] **Task 3.4**: Add bookmark quick actions
  - [ ] Floating action button (FAB) for quick save
  - [ ] Keyboard shortcuts:
    - Ctrl+D: Save current URL
    - Ctrl+B: Open bookmark sidebar

- [ ] **Task 3.5**: Integrate into existing pages
  - [ ] Add bookmark button to navigation bar
  - [ ] Add bookmark sidebar to Discover page
  - [ ] Add bookmark sidebar to Workshop page

### Phase 4: Advanced Features

- [ ] **Task 4.1**: Add tags support
  - [ ] Tag autocomplete (suggest existing tags)
  - [ ] Filter bookmarks by tag
  - [ ] Tag cloud visualization

- [ ] **Task 4.2**: Add categories
  - [ ] Predefined categories: "Searches", "Filters", "Dashboards"
  - [ ] Custom categories
  - [ ] Group bookmarks by category

- [ ] **Task 4.3**: Add bookmark folders
  - [ ] Hierarchical organization
  - [ ] Drag-and-drop to reorder
  - [ ] Collapse/expand folders

- [ ] **Task 4.4**: Add bookmark sharing
  - [ ] Generate shareable link
  - [ ] Copy shareable link to clipboard
  - [ ] Optional: Make bookmark public (visible to all users)

- [ ] **Task 4.5**: Add bookmark import/export
  - [ ] Export bookmarks as JSON
  - [ ] Import bookmarks from JSON
  - [ ] Import from browser bookmarks (Chrome, Firefox)

### Phase 5: Testing & Deployment

- [ ] **Task 5.1**: End-to-end testing
  - [ ] Test save bookmark workflow
  - [ ] Test restore bookmark workflow
  - [ ] Test copy to clipboard
  - [ ] Test edit/delete operations
  - [ ] Test search/filter functionality

- [ ] **Task 5.2**: User acceptance testing
  - [ ] Test with real users
  - [ ] Gather feedback on UI/UX
  - [ ] Iterate on design

- [ ] **Task 5.3**: Production deployment
  - [ ] Deploy backend v1.6.0
  - [ ] Deploy frontend v1.3.0
  - [ ] Monitor for errors

- [ ] **Task 5.4**: Documentation
  - [ ] Update CLAUDE.md with bookmark feature
  - [ ] Add user guide
  - [ ] Add screenshots to docs

---

## API Design

### Backend Endpoints

#### GET /api/v1/bookmarks

**Description**: List all bookmarks for authenticated user

**Authentication**: Required (JWT token)

**Query Parameters**:
- `sort`: `name` | `created_at` | `last_used_at` (default: `created_at`)
- `order`: `asc` | `desc` (default: `desc`)
- `search`: Search text (matches name, url, tags, notes)
- `tag`: Filter by tag
- `limit`: Max results (default: 50)
- `offset`: Pagination offset

**Response**:
```json
{
  "bookmarks": [
    {
      "id": "uuid-1",
      "name": "1960s Ford Mustangs",
      "url": "http://autos.minilab/discover?models=Ford:Mustang&yearMin=1960&yearMax=1969",
      "params": {
        "models": "Ford:Mustang",
        "yearMin": "1960",
        "yearMax": "1969"
      },
      "tags": ["classic", "ford"],
      "notes": "My favorite muscle cars",
      "createdAt": "2025-11-03T12:00:00Z",
      "lastUsedAt": "2025-11-03T14:30:00Z",
      "useCount": 5
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

#### POST /api/v1/bookmarks

**Description**: Create new bookmark

**Authentication**: Required

**Request Body**:
```json
{
  "name": "1960s Ford Mustangs",
  "url": "http://autos.minilab/discover?models=Ford:Mustang&yearMin=1960&yearMax=1969",
  "params": {
    "models": "Ford:Mustang",
    "yearMin": "1960",
    "yearMax": "1969"
  },
  "tags": ["classic", "ford"],
  "notes": "My favorite muscle cars"
}
```

**Response**:
```json
{
  "id": "uuid-1",
  "name": "1960s Ford Mustangs",
  "url": "http://autos.minilab/discover?models=Ford:Mustang&yearMin=1960&yearMax=1969",
  "params": {
    "models": "Ford:Mustang",
    "yearMin": "1960",
    "yearMax": "1969"
  },
  "tags": ["classic", "ford"],
  "notes": "My favorite muscle cars",
  "createdAt": "2025-11-03T12:00:00Z",
  "useCount": 0
}
```

#### PUT /api/v1/bookmarks/:id

**Description**: Update bookmark (name, tags, notes only - URL is immutable)

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Classic Ford Mustangs (1960s)",
  "tags": ["classic", "ford", "mustang"],
  "notes": "Updated description"
}
```

**Response**: Updated bookmark object

#### DELETE /api/v1/bookmarks/:id

**Description**: Delete bookmark

**Authentication**: Required

**Response**:
```json
{
  "deleted": true,
  "id": "uuid-1"
}
```

#### POST /api/v1/bookmarks/:id/track-usage

**Description**: Track bookmark usage (increment count, update last used timestamp)

**Authentication**: Required

**Response**:
```json
{
  "id": "uuid-1",
  "useCount": 6,
  "lastUsedAt": "2025-11-03T15:00:00Z"
}
```

---

## Frontend Service API

### BookmarkService

```typescript
@Injectable({
  providedIn: 'root',
})
export class BookmarkService {
  /**
   * List all bookmarks for current user
   */
  list(options?: BookmarkListOptions): Observable<BookmarkListResponse>;

  /**
   * Create new bookmark from current URL
   */
  create(bookmark: CreateBookmarkRequest): Observable<Bookmark>;

  /**
   * Capture current URL as bookmark (convenience method)
   */
  captureCurrentUrl(name?: string): Observable<Bookmark>;

  /**
   * Update bookmark (name, tags, notes)
   */
  update(id: string, updates: UpdateBookmarkRequest): Observable<Bookmark>;

  /**
   * Delete bookmark
   */
  delete(id: string): Observable<void>;

  /**
   * Restore bookmark (navigate to URL)
   */
  restoreBookmark(bookmark: Bookmark): void;

  /**
   * Copy bookmark URL to clipboard
   */
  copyToClipboard(bookmark: Bookmark): Promise<void>;

  /**
   * Track bookmark usage
   */
  trackUsage(id: string): Observable<void>;

  /**
   * Get recent bookmarks (by last used)
   */
  getRecentBookmarks(limit: number): Observable<Bookmark[]>;

  /**
   * Search bookmarks by text
   */
  search(query: string): Observable<Bookmark[]>;

  /**
   * Filter bookmarks by tag
   */
  filterByTag(tag: string): Observable<Bookmark[]>;

  /**
   * Export bookmarks as JSON
   */
  export(): string;

  /**
   * Import bookmarks from JSON
   */
  import(json: string): Observable<number>;
}
```

---

## UI/UX Design

### Bookmark Save Dialog

```
┌─────────────────────────────────────────────────────┐
│  Save Bookmark                                   ✕  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Name:                                              │
│  [1960s Ford Mustangs________________________]     │
│                                                     │
│  Tags (optional):                                   │
│  [classic, ford__________________________]         │
│                                                     │
│  Notes (optional):                                  │
│  [_________________________________________]       │
│  [_________________________________________]       │
│                                                     │
│  URL Preview:                                       │
│  http://autos.minilab/discover?models=Ford...      │
│                                                     │
│              [Cancel]  [Save Bookmark]             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Bookmark Manager

```
┌─────────────────────────────────────────────────────┐
│  My Bookmarks                                       │
├─────────────────────────────────────────────────────┤
│  [Search bookmarks_____________] [Sort: Recent ▼]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🔖 1960s Ford Mustangs                       │  │
│  │    classic, ford                             │  │
│  │    Created: Nov 3, 2025  Used: 5 times      │  │
│  │    [Open] [Copy URL] [Edit] [Delete]        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🔖 Chevrolet Corvettes (All Years)          │  │
│  │    corvette, sports-car                      │  │
│  │    Created: Nov 2, 2025  Used: 12 times     │  │
│  │    [Open] [Copy URL] [Edit] [Delete]        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🔖 SUVs from 2020-2025                       │  │
│  │    suv, modern                               │  │
│  │    Created: Nov 1, 2025  Used: 3 times      │  │
│  │    [Open] [Copy URL] [Edit] [Delete]        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Bookmark Sidebar (Collapsed)

```
┌─────────┐
│    🔖   │  <- Click to expand
│         │
└─────────┘
```

### Bookmark Sidebar (Expanded)

```
┌──────────────────────────────────────┐
│  Bookmarks                        ✕  │
├──────────────────────────────────────┤
│  [+ Save Current URL]                │
├──────────────────────────────────────┤
│  Recent:                             │
│  • 1960s Ford Mustangs         [>]  │
│  • Chevrolet Corvettes         [>]  │
│  • SUVs from 2020-2025         [>]  │
├──────────────────────────────────────┤
│  [View All Bookmarks]                │
└──────────────────────────────────────┘
```

---

## Integration with UrlParamService

### Saving Current URL

```typescript
// User clicks "Save Bookmark"
saveCurrentUrl() {
  // Capture current URL and params
  const currentUrl = window.location.href;
  const currentParams = this.urlParamService.getAllParams();

  // Auto-generate name from params
  const name = this.generateName(currentParams);

  // Open save dialog
  this.openSaveDialog({ url: currentUrl, params: currentParams, name });
}

// Generate friendly name from URL params
generateName(params: Record<string, string>): string {
  if (params.models) {
    return `Search: ${params.models.split(',').join(', ')}`;
  }
  if (params.yearMin && params.yearMax) {
    return `Vehicles from ${params.yearMin} to ${params.yearMax}`;
  }
  return `Saved Search - ${new Date().toLocaleDateString()}`;
}
```

### Restoring Bookmark

```typescript
// User clicks "Open" on bookmark
restoreBookmark(bookmark: Bookmark) {
  // Track usage
  this.bookmarkService.trackUsage(bookmark.id).subscribe();

  // Navigate to URL (uses Angular Router)
  this.router.navigateByUrl(bookmark.url);

  // OR: Use UrlParamService to set params (preserves current route)
  this.urlParamService.setParams(bookmark.params);
}
```

### Copying to Clipboard

```typescript
// User clicks "Copy URL"
async copyToClipboard(bookmark: Bookmark) {
  try {
    await navigator.clipboard.writeText(bookmark.url);
    this.notificationService.success('URL copied to clipboard');
  } catch (error) {
    console.error('Failed to copy:', error);
    this.notificationService.error('Failed to copy URL');
  }
}
```

---

## Benefits of UrlParamService Integration

1. **Automatic State Capture**: UrlParamService already manages all URL parameters
2. **Type-Safe**: getAllParams() returns structured data
3. **No Manual Tracking**: Don't need to manually track which params to save
4. **Consistent**: Works across all pages (Discover, Workshop, etc.)
5. **Flexible Restore**: Can use full URL or just params

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+D | Save current URL as bookmark |
| Ctrl+B | Toggle bookmark sidebar |
| Ctrl+Shift+B | Open bookmark manager |
| Escape | Close bookmark dialog/sidebar |

---

## Success Criteria

- [ ] User can save current URL with custom name
- [ ] User can browse all saved bookmarks
- [ ] User can click bookmark to navigate
- [ ] User can copy URL to clipboard
- [ ] User can edit bookmark name/tags/notes
- [ ] User can delete bookmark (with confirmation)
- [ ] Bookmarks persist across sessions/browsers
- [ ] Recent bookmarks load in <200ms
- [ ] 95% test coverage for BookmarkService

---

## Related Documentation

- **UrlParamService**: `frontend/src/app/core/services/url-param.service.ts`
- **URL-First Paradigm**: `docs/design/url-first-paradigm-validation.md`
- **State Management Guide**: `docs/state-management-guide.md`

---

## Future Enhancements (v2.0)

- [ ] Bookmark folders/categories
- [ ] Bookmark sharing (generate shareable links)
- [ ] Public bookmarks (visible to all users)
- [ ] Bookmark analytics (most popular searches)
- [ ] Smart bookmarks (automatically suggest based on behavior)
- [ ] Bookmark templates (pre-defined searches)

---

**END OF DOCUMENT**
