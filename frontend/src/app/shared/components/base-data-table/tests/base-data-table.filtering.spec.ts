import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BaseDataTableComponent } from '../base-data-table.component';
import { ColumnManagerComponent } from '../../column-manager/column-manager.component';
import { TableStatePersistenceService } from '../../../services/table-state-persistence.service';
import { MockTableDataSource } from '../mocks/mock-data-source';
import { createTestColumns } from './test-helpers';
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
import { TableQueryParams } from '../../../models/table-data-source.model';

describe('BaseDataTableComponent - Filtering', () => {
  let component: BaseDataTableComponent<any>;
  let fixture: ComponentFixture<BaseDataTableComponent<any>>;
  let mockDataSource: MockTableDataSource;
  let persistenceService: jasmine.SpyObj<TableStatePersistenceService>;

  beforeEach(async () => {
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
        NzAlertModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: TableStatePersistenceService, useValue: persistenceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    persistenceService = TestBed.inject(TableStatePersistenceService) as jasmine.SpyObj<TableStatePersistenceService>;
    persistenceService.loadPreferences.and.returnValue(null);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseDataTableComponent);
    component = fixture.componentInstance;
    
    mockDataSource = new MockTableDataSource();
    component.tableId = 'test-table';
    component.columns = createTestColumns();
    component.dataSource = mockDataSource;
    component.queryParams = {
      page: 1,
      size: 20,
      filters: {}
    };
    
    fixture.detectChanges();
  });

  describe('Filter Input Handling', () => {
    
    it('should update filters object when onFilterChange is called', () => {
      component.onFilterChange('manufacturer', 'Ford');
      expect(component.filters['manufacturer']).toBe('Ford');
    });

    it('should trigger fetchData after debounce when filter changes', fakeAsync(() => {
      const fetchSpy = spyOn(component, 'fetchData');
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      expect(fetchSpy).toHaveBeenCalled();
    }));

    it('should remove filter when value is empty string', () => {
      component.filters['manufacturer'] = 'Ford';
      component.onFilterChange('manufacturer', '');
      expect(component.filters['manufacturer']).toBeUndefined();
    });

    it('should remove filter when value is null', () => {
      component.filters['manufacturer'] = 'Ford';
      component.onFilterChange('manufacturer', null);
      expect(component.filters['manufacturer']).toBeUndefined();
    });

  });

  describe('Filter Debouncing', () => {
    
    it('should debounce filter input (400ms delay)', fakeAsync(() => {
      const fetchSpy = spyOn(component, 'fetchData');
      component.onFilterChange('manufacturer', 'F');
      tick(100);
      component.onFilterChange('manufacturer', 'Fo');
      tick(100);
      component.onFilterChange('manufacturer', 'For');
      tick(100);
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    }));

    it('should NOT fetch data before debounce time completes', fakeAsync(() => {
      const fetchSpy = spyOn(component, 'fetchData');
      component.onFilterChange('manufacturer', 'Ford');
      tick(399);
      expect(fetchSpy).not.toHaveBeenCalled();
    }));

  });

  describe('Filter State Management', () => {
    
    it('should reset to page 1 when filter changes', fakeAsync(() => {
      component.currentPage = 5;
      spyOn(component, 'fetchData');
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      expect(component.currentPage).toBe(1);
    }));

    it('should emit queryParamsChange when filter changes', fakeAsync(() => {
      const emitSpy = spyOn(component.queryParamsChange, 'emit');
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      expect(emitSpy).toHaveBeenCalled();
      const emittedParams = emitSpy.calls.mostRecent().args[0] as TableQueryParams;
      expect(emittedParams.filters?.['manufacturer']).toBe('Ford');
    }));

  });

  describe('Data Source Integration', () => {
    
    it('should pass filters to data source', fakeAsync(() => {
      const dataSourceSpy = spyOn(mockDataSource, 'fetch').and.callThrough();
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      expect(dataSourceSpy).toHaveBeenCalled();
      const params = dataSourceSpy.calls.mostRecent().args[0];
      expect(params.filters?.['manufacturer']).toBe('Ford');
    }));

    it('should filter data correctly through data source', fakeAsync(() => {
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      expect(component.tableData.length).toBe(2);
      component.tableData.forEach(item => {
        expect(item.manufacturer).toBe('Ford');
      });
    }));

  });

  describe('Clear Filters', () => {
    
    it('should clear all filters when clearFilters is called', () => {
      component.filters = {
        manufacturer: 'Ford',
        model: 'F-150',
        year: 2020
      };
      component.clearFilters();
      expect(component.filters).toEqual({});
    });

    it('should fetch data after clearing filters', fakeAsync(() => {
      component.filters = { manufacturer: 'Ford' };
      const fetchSpy = spyOn(component, 'fetchData');
      component.clearFilters();
      tick(400);
      expect(fetchSpy).toHaveBeenCalled();
    }));

  });

  describe('Multiple Filters', () => {
    
    it('should handle multiple simultaneous filters', fakeAsync(() => {
      component.onFilterChange('manufacturer', 'Ford');
      component.onFilterChange('year', 2020);
      tick(400);
      const params = mockDataSource.lastParams;
      expect(params?.filters?.['manufacturer']).toBe('Ford');
      expect(params?.filters?.['year']).toBe(2020);
    }));

    it('should filter data with multiple criteria', fakeAsync(() => {
      component.onFilterChange('manufacturer', 'Ford');
      component.onFilterChange('body_class', 'Pickup');
      tick(400);
      expect(component.tableData.length).toBe(1);
      expect(component.tableData[0].manufacturer).toBe('Ford');
      expect(component.tableData[0].body_class).toBe('Pickup');
    }));

  });

  describe('Edge Cases', () => {
    
    it('should handle empty filter value', fakeAsync(() => {
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      expect(component.tableData.length).toBe(2);
      component.onFilterChange('manufacturer', '');
      tick(400);
      expect(component.tableData.length).toBe(5);
    }));

    it('should handle filter with no matching results', fakeAsync(() => {
      component.onFilterChange('manufacturer', 'NonExistentBrand');
      tick(400);
      expect(component.tableData.length).toBe(0);
    }));

    it('should be case-insensitive when filtering', fakeAsync(() => {
      component.onFilterChange('manufacturer', 'ford');
      tick(400);
      expect(component.tableData.length).toBe(2);
    }));

  });

});
