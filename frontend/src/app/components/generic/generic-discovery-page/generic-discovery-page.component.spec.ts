import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { GenericDiscoveryPageComponent } from './generic-discovery-page.component';
import { GenericHierarchicalPickerComponent } from '../generic-hierarchical-picker/generic-hierarchical-picker.component';
import { GenericResultsTableComponent } from '../generic-results-table/generic-results-table.component';
import { GenericStateManagementService } from '../../../services/generic';
import { DomainConfigService } from '../../../services/generic';

// NG-ZORRO mocks
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

describe('GenericDiscoveryPageComponent (Integration)', () => {
  let component: GenericDiscoveryPageComponent;
  let fixture: ComponentFixture<GenericDiscoveryPageComponent>;
  let stateService: jasmine.SpyObj<GenericStateManagementService>;
  let domainConfig: jasmine.SpyObj<DomainConfigService>;

  beforeEach(async () => {
    const stateSpy = jasmine.createSpyObj('GenericStateManagementService', [
      'updateFilters',
      'refreshData'
    ], {
      filters$: of({ page: 1, size: 20 }),
      state$: of({
        filters: { page: 1, size: 20 },
        results: [],
        total: 0,
        loading: false,
        error: null
      }),
      results$: of([])
    });

    const configSpy = jasmine.createSpyObj('DomainConfigService', [
      'getCurrentConfig'
    ]);

    configSpy.getCurrentConfig.and.returnValue({
      domain: {
        id: 'vehicles',
        name: 'Vehicle Explorer',
        icon: 'car',
        version: '1.0.0'
      },
      entity: {
        type: 'vehicle',
        hierarchies: [
          {
            id: 'manufacturer-model',
            name: 'Manufacturer → Model',
            levels: [
              { key: 'manufacturer', label: 'Manufacturer' },
              { key: 'model', label: 'Model' }
            ]
          }
        ]
      }
    } as any);

    await TestBed.configureTestingModule({
      declarations: [
        GenericDiscoveryPageComponent,
        GenericHierarchicalPickerComponent,
        GenericResultsTableComponent
      ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule,
        NzCardModule,
        NzEmptyModule,
        NzTagModule,
        NzButtonModule,
        NzIconModule
      ],
      providers: [
        { provide: GenericStateManagementService, useValue: stateSpy },
        { provide: DomainConfigService, useValue: configSpy }
      ]
    }).compileComponents();

    stateService = TestBed.inject(GenericStateManagementService) as jasmine.SpyObj<GenericStateManagementService>;
    domainConfig = TestBed.inject(DomainConfigService) as jasmine.SpyObj<DomainConfigService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GenericDiscoveryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should initialize from domain config', () => {
    expect(component.domainName).toBe('Vehicle Explorer');
    expect(component.domainIcon).toBe('car');
  });

  it('should subscribe to state on init', () => {
    expect(component.selectedItems).toBeDefined();
    expect(component.hasResults).toBe(false);
  });

  it('should handle selection change from picker', () => {
    const selections = [
      { path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }
    ];

    component.onSelectionChange(selections);

    expect(stateService.updateFilters).toHaveBeenCalledWith({
      selectedItems: selections,
      page: 1
    });
  });

  it('should clear selections', () => {
    component.clearSelections();

    expect(stateService.updateFilters).toHaveBeenCalledWith({
      selectedItems: [],
      page: 1
    });
  });

  it('should display selected items when present', () => {
    component.selectedItems = [
      { path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.selected-items-list')).toBeTruthy();
  });

  it('should show empty state when no selections', () => {
    component.selectedItems = [];
    component.hasResults = false;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
  });

  it('should show results section when has results', () => {
    component.selectedItems = [
      { path: ['Ford'], display: 'Ford', level: 0 }
    ];
    component.hasResults = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.results-section')).toBeTruthy();
  });
});
