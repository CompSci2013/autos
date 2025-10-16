---

# **Migration Guide: Golden Layout → @katoid/angular-grid-layout**

## **Conceptual Differences**

| Aspect | Golden Layout | @katoid/angular-grid-layout |
|--------|--------------|----------------------------|
| **Layout Model** | Hierarchical (rows/columns/stacks/components) | Flat grid (x, y, width, height) |
| **Dependencies** | jQuery required | Pure Angular, no dependencies |
| **Component Registration** | `registerComponent()` + entryComponents | Standard Angular components in `*ngFor` |
| **Config Format** | Nested tree structure | Array of positioned items |
| **Persistence** | JSON config tree | Simple layout array |

---

## **Step-by-Step Migration Process**

### **Phase 1: Audit & Planning**

**1. Document your current Golden Layout structure:**

```typescript
// Example Golden Layout config
const goldenConfig = {
  content: [{
    type: 'row',
    content: [{
      type: 'component',
      componentName: 'myComponent',
      title: 'My Panel'
    }, {
      type: 'column',
      content: [/* nested items */]
    }]
  }]
};
```

**2. List all registered components:**
- Note component names
- Document their data/state requirements
- Identify parent-child relationships

**3. Map to grid positions:**
- Flatten the hierarchy
- Assign grid coordinates (x, y, w, h)

---

### **Phase 2: Installation & Setup**

**1. Install @katoid/angular-grid-layout:**

```bash
npm install @katoid/angular-grid-layout@2.1.0  # For Angular 14
# or
npm install @katoid/angular-grid-layout@latest  # For Angular 16+
```

**2. Remove Golden Layout dependencies:**

```bash
npm uninstall golden-layout ngx-golden-layout @embedded-enterprises/ng6-golden-layout
npm uninstall jquery  # If only used by Golden Layout
```

**3. Import KtdGridModule:**

```typescript
// app.module.ts
import { KtdGridModule } from '@katoid/angular-grid-layout';

@NgModule({
  imports: [
    // Remove: GoldenLayoutModule.forRoot(config)
    KtdGridModule  // Add this
  ]
})
```

**4. Remove jQuery from angular.json:**

```json
// angular.json - Remove jQuery script
"scripts": [
  // Delete: "node_modules/jquery/dist/jquery.min.js"
]
```

---

### **Phase 3: Convert Layout Configuration**

**Golden Layout config → Katoid layout array**

**Before (Golden Layout):**
```typescript
const goldenConfig = {
  content: [{
    type: 'row',
    content: [{
      type: 'component',
      componentName: 'picker',
      componentState: { /* data */ }
    }, {
      type: 'component',
      componentName: 'results',
      componentState: { /* data */ }
    }]
  }]
};
```

**After (Katoid):**
```typescript
import { KtdGridLayout } from '@katoid/angular-grid-layout';

layout: KtdGridLayout = [
  { id: 'picker', x: 0, y: 0, w: 6, h: 10 },
  { id: 'results', x: 6, y: 0, w: 6, h: 10 }
];
```

**Conversion Helper Function:**

```typescript
function convertGoldenToKatoid(goldenConfig: any): KtdGridLayout {
  const items: KtdGridLayout = [];
  let currentY = 0;
  
  function flattenContent(content: any[], startX = 0, startY = 0, width = 12) {
    content.forEach((item, index) => {
      if (item.type === 'component') {
        items.push({
          id: item.componentName,
          x: startX,
          y: startY,
          w: width,
          h: item.height || 8  // Default height
        });
        startY += item.height || 8;
      } else if (item.type === 'row') {
        const itemWidth = width / item.content.length;
        item.content.forEach((child: any, i: number) => {
          flattenContent([child], startX + (i * itemWidth), startY, itemWidth);
        });
      } else if (item.type === 'column') {
        flattenContent(item.content, startX, startY, width);
      }
    });
  }
  
  flattenContent(goldenConfig.content);
  return items;
}
```

---

### **Phase 4: Refactor Components**

**1. Remove Golden Layout decorators/injections:**

**Before:**
```typescript
import { GoldenLayoutContainer } from 'ngx-golden-layout';

@Component({/*...*/})
export class MyComponent {
  constructor(
    @Inject(GoldenLayoutContainer) private container: GoldenLayout.Container
  ) {
    // Golden Layout specific code
    this.container.on('resize', () => {/*...*/});
  }
}
```

**After:**
```typescript
// Standard Angular component - no special injections needed
@Component({/*...*/})
export class MyComponent {
  constructor() {
    // Clean, simple constructor
  }
  
  // Use standard Angular lifecycle hooks
  ngAfterViewInit() {
    // Handle resize if needed
  }
}
```

**2. Replace component state management:**

**Before (Golden Layout state):**
```typescript
const state = this.container.getState();
this.container.setState(newState);
```

**After (Angular @Input):**
```typescript
@Input() config: any;  // Pass data via standard Angular bindings
```

---

### **Phase 5: Update Template**

**Before (Golden Layout):**
```html
<golden-layout-root [layout]="layoutConfig"></golden-layout-root>
```

**After (Katoid):**
```html
<ktd-grid
  [cols]="12"
  [rowHeight]="50"
  [layout]="layout"
  (layoutUpdated)="onLayoutUpdated($event)"
  [gap]="16">
  
  <ktd-grid-item 
    *ngFor="let item of layout; trackBy:trackById" 
    [id]="item.id">
    
    <!-- Use ng-container with ngSwitch to render different components -->
    <ng-container [ngSwitch]="item.id">
      <app-picker *ngSwitchCase="'picker'"></app-picker>
      <app-results *ngSwitchCase="'results'"></app-results>
      <app-chart *ngSwitchCase="'chart'"></app-chart>
    </ng-container>
    
  </ktd-grid-item>
</ktd-grid>
```

---

### **Phase 6: Implement Persistence**

**Before (Golden Layout):**
```typescript
// Save
const state = myLayout.toConfig();
localStorage.setItem('layout', JSON.stringify(state));

// Load
const savedState = JSON.parse(localStorage.getItem('layout'));
myLayout = new GoldenLayout(savedState);
```

**After (Katoid):**
```typescript
// Save (much simpler!)
onLayoutUpdated(layout: KtdGridLayout): void {
  this.layout = layout;
  localStorage.setItem('layout', JSON.stringify(layout));
}

// Load
ngOnInit() {
  const saved = localStorage.getItem('layout');
  if (saved) {
    this.layout = JSON.parse(saved);
  }
}
```

---

### **Phase 7: Handle Missing Features**

**Features Golden Layout has that Katoid doesn't:**

| Feature | Golden Layout | Katoid Alternative |
|---------|--------------|-------------------|
| **Popout windows** | Built-in | Not supported - use window.open() manually |
| **Tabs/Stacks** | Built-in | Use NG-ZORRO tabs inside grid items |
| **Header menus** | Built-in | Add custom header components |
| **Maximize/minimize** | Built-in | Implement with layout manipulation |

**Example: Add tabs inside grid item:**

```html
<ktd-grid-item [id]="'tabbed-panel'">
  <nz-tabset>
    <nz-tab nzTitle="Tab 1">
      <app-component-one></app-component-one>
    </nz-tab>
    <nz-tab nzTitle="Tab 2">
      <app-component-two></app-component-two>
    </nz-tab>
  </nz-tabset>
</ktd-grid-item>
```

---

## **Migration Checklist**

- [ ] Document current Golden Layout structure
- [ ] Install @katoid/angular-grid-layout
- [ ] Remove Golden Layout dependencies
- [ ] Convert config to flat layout array
- [ ] Remove Golden Layout injections from components
- [ ] Update templates to use ktd-grid
- [ ] Implement localStorage persistence
- [ ] Test drag & resize functionality
- [ ] Handle any missing features (tabs, popouts, etc.)
- [ ] Remove jQuery if no longer needed
- [ ] Update unit tests
- [ ] Test in all supported browsers

---

## **Common Pitfalls & Solutions**

**1. "My components don't render!"**
- Ensure `trackBy` is used in `*ngFor`
- Check that component IDs match layout IDs

**2. "Layout doesn't persist!"**
- Implement `(layoutUpdated)` event handler
- Save to localStorage on every update

**3. "Resize doesn't work!"**
- Add `[resizable]="true"` to ktd-grid-item
- Check CSS doesn't have `overflow: hidden` on grid items

**4. "Performance issues with many items!"**
- Use `trackBy` function
- Implement virtual scrolling inside grid items if needed
- Consider lazy-loading components

---

## **Benefits After Migration**

✅ **Simpler** - No jQuery, no complex configuration  
✅ **Maintainable** - Active development, Angular-native  
✅ **Smaller Bundle** - ~50% reduction in size  
✅ **Better Performance** - Optimized for Angular change detection  
✅ **Type Safety** - Full TypeScript support  
✅ **Easier Testing** - Standard Angular component testing  

---

