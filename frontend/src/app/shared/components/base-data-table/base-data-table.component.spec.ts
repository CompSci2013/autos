import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BaseDataTableComponent } from './base-data-table.component';
import { ColumnManagerComponent } from '../column-manager/column-manager.component';
import { TableStatePersistenceService } from '../../services/table-state-persistence.service';
import { MockTableDataSource } from './mocks/mock-data-source';
import { createTestColumns } from './tests/test-helpers';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTransferModule } from 'ng-zorro-antd/transfer';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('BaseDataTableComponent', () => {
  let component: BaseDataTableComponent<any>;
  let fixture: ComponentFixture<BaseDataTableComponent<any>>;
  let mockDataSource: MockTableDataSource;
  let persistenceService: jasmine.SpyObj<TableStatePersistenceService>;

  beforeEach(async () => {
    // Create spy for persistence service with correct method names
    const persistenceSpy = jasmine.createSpyObj('TableStatePersistenceService', [
      'loadPreferences',
      'savePreferences',
      'resetPreferences'
    ]);

    await TestBed.configureTestingModule({
      declarations: [
        BaseDataTableComponent,
        ColumnManagerComponent
      ],
      imports: [
        FormsModule,
        HttpClientModule,
        DragDropModule,
        NzTableModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzEmptyModule,
        NzSpinModule,
        NzDrawerModule,
        NzTransferModule,
        NzAlertModule,  // Add NzAlertModule
        NoopAnimationsModule
      ],
      providers: [
        { provide: TableStatePersistenceService, useValue: persistenceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]  // Add to suppress icon errors
    }).compileComponents();

    persistenceService = TestBed.inject(TableStatePersistenceService) as jasmine.SpyObj<TableStatePersistenceService>;
    
    // Setup default return value for loadPreferences
    persistenceService.loadPreferences.and.returnValue(null);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseDataTableComponent);
    component = fixture.componentInstance;
    
    // Setup required inputs
    mockDataSource = new MockTableDataSource();
    component.tableId = 'test-table';
    component.columns = createTestColumns();
    component.dataSource = mockDataSource;
    component.queryParams = {
      page: 1,
      size: 20,
      filters: {}
    };
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have required inputs defined', () => {
    expect(component.tableId).toBe('test-table');
    expect(component.columns.length).toBeGreaterThan(0);
    expect(component.dataSource).toBeTruthy();
  });

  it('should initialize with default query params', () => {
    fixture.detectChanges(); // Trigger ngOnInit
    
    expect(component.currentPage).toBe(1);
    expect(component.pageSize).toBe(20);
    expect(component.filters).toEqual({});
  });
});
