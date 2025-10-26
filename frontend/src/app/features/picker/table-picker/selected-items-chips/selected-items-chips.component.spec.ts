import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectedItemsChipsComponent, ChipGroup } from './selected-items-chips.component';
import { ManufacturerModelSelection } from '../../../../models';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('SelectedItemsChipsComponent - Hierarchical Chip Display', () => {
  let component: SelectedItemsChipsComponent;
  let fixture: ComponentFixture<SelectedItemsChipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectedItemsChipsComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectedItemsChipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty selections', () => {
      expect(component.selections).toEqual([]);
    });

    it('should have removeModel output emitter', () => {
      expect(component.removeModel).toBeDefined();
    });

    it('should have removeManufacturer output emitter', () => {
      expect(component.removeManufacturer).toBeDefined();
    });
  });

  describe('Grouped Chips Generation', () => {
    it('should group models by manufacturer', () => {
      component.selections = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Ford', model: 'Mustang' },
        { manufacturer: 'Chevrolet', model: 'Corvette' },
      ];

      const groups = component.groupedChips;

      expect(groups.length).toBe(2);
      expect(groups[0].manufacturer).toBe('Chevrolet'); // Alphabetically first
      expect(groups[1].manufacturer).toBe('Ford');
    });

    it('should count models per manufacturer correctly', () => {
      component.selections = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Ford', model: 'Mustang' },
        { manufacturer: 'Ford', model: 'Explorer' },
      ];

      const groups = component.groupedChips;

      expect(groups[0].count).toBe(3);
    });

    it('should sort models alphabetically within group', () => {
      component.selections = [
        { manufacturer: 'Ford', model: 'Mustang' },
        { manufacturer: 'Ford', model: 'Explorer' },
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      const groups = component.groupedChips;

      expect(groups[0].models).toEqual(['Explorer', 'F-150', 'Mustang']);
    });

    it('should sort manufacturers alphabetically', () => {
      component.selections = [
        { manufacturer: 'Toyota', model: 'Camry' },
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Chevrolet', model: 'Corvette' },
      ];

      const groups = component.groupedChips;

      expect(groups[0].manufacturer).toBe('Chevrolet');
      expect(groups[1].manufacturer).toBe('Ford');
      expect(groups[2].manufacturer).toBe('Toyota');
    });

    it('should return empty array when no selections', () => {
      component.selections = [];

      const groups = component.groupedChips;

      expect(groups).toEqual([]);
    });

    it('should handle single manufacturer with single model', () => {
      component.selections = [{ manufacturer: 'Ford', model: 'F-150' }];

      const groups = component.groupedChips;

      expect(groups.length).toBe(1);
      expect(groups[0].manufacturer).toBe('Ford');
      expect(groups[0].models).toEqual(['F-150']);
      expect(groups[0].count).toBe(1);
    });

    it('should handle multiple manufacturers each with one model', () => {
      component.selections = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Chevrolet', model: 'Corvette' },
        { manufacturer: 'Toyota', model: 'Camry' },
      ];

      const groups = component.groupedChips;

      expect(groups.length).toBe(3);
      groups.forEach((group) => {
        expect(group.count).toBe(1);
        expect(group.models.length).toBe(1);
      });
    });
  });

  describe('Remove Model', () => {
    it('should emit removeModel event with manufacturer and model', () => {
      spyOn(component.removeModel, 'emit');

      component.onRemoveModel('Ford', 'F-150');

      expect(component.removeModel.emit).toHaveBeenCalledWith({
        manufacturer: 'Ford',
        model: 'F-150',
      });
    });

    it('should emit correct event for different models', () => {
      spyOn(component.removeModel, 'emit');

      component.onRemoveModel('Chevrolet', 'Corvette');

      expect(component.removeModel.emit).toHaveBeenCalledWith({
        manufacturer: 'Chevrolet',
        model: 'Corvette',
      });
    });

    it('should emit event with exact manufacturer and model values', () => {
      spyOn(component.removeModel, 'emit');

      const manufacturer = 'Ford';
      const model = 'Mustang GT';

      component.onRemoveModel(manufacturer, model);

      const emitted = (component.removeModel.emit as jasmine.Spy).calls.mostRecent().args[0];
      expect(emitted.manufacturer).toBe(manufacturer);
      expect(emitted.model).toBe(model);
    });
  });

  describe('Remove Manufacturer', () => {
    it('should emit removeManufacturer event with manufacturer name', () => {
      spyOn(component.removeManufacturer, 'emit');

      component.onRemoveManufacturer('Ford');

      expect(component.removeManufacturer.emit).toHaveBeenCalledWith('Ford');
    });

    it('should emit correct manufacturer name', () => {
      spyOn(component.removeManufacturer, 'emit');

      component.onRemoveManufacturer('Chevrolet');

      expect(component.removeManufacturer.emit).toHaveBeenCalledWith('Chevrolet');
    });

    it('should emit event with exact manufacturer value', () => {
      spyOn(component.removeManufacturer, 'emit');

      const manufacturer = 'Toyota';

      component.onRemoveManufacturer(manufacturer);

      expect(component.removeManufacturer.emit).toHaveBeenCalledWith(manufacturer);
    });
  });

  describe('Complex Selection Scenarios', () => {
    it('should handle large number of selections', () => {
      const selections: ManufacturerModelSelection[] = [];

      // Create 100 selections across 10 manufacturers
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          selections.push({
            manufacturer: `Manufacturer${i}`,
            model: `Model${j}`,
          });
        }
      }

      component.selections = selections;

      const groups = component.groupedChips;

      expect(groups.length).toBe(10);
      groups.forEach((group) => {
        expect(group.count).toBe(10);
        expect(group.models.length).toBe(10);
      });
    });

    it('should handle duplicate manufacturer-model combinations', () => {
      component.selections = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Ford', model: 'F-150' }, // Duplicate
        { manufacturer: 'Ford', model: 'Mustang' },
      ];

      const groups = component.groupedChips;

      // Should still group them (component doesn't deduplicate)
      expect(groups[0].count).toBe(3);
    });

    it('should preserve all models even with duplicates', () => {
      component.selections = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      const groups = component.groupedChips;

      // Duplicates should appear in models array
      expect(groups[0].models.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle selections with special characters in names', () => {
      component.selections = [
        { manufacturer: 'Ford-Lincoln', model: 'F-150 SuperCrew' },
        { manufacturer: 'GM (General Motors)', model: "Chevrolet Corvette Z06" },
      ];

      const groups = component.groupedChips;

      expect(groups.length).toBe(2);
      expect(groups[0].manufacturer).toContain('Ford-Lincoln');
      expect(groups[1].manufacturer).toContain('GM');
    });

    it('should handle very long manufacturer names', () => {
      component.selections = [
        {
          manufacturer: 'Very Long Manufacturer Name That Exceeds Normal Length',
          model: 'Model',
        },
      ];

      const groups = component.groupedChips;

      expect(groups[0].manufacturer).toBe(
        'Very Long Manufacturer Name That Exceeds Normal Length'
      );
    });

    it('should handle very long model names', () => {
      component.selections = [
        {
          manufacturer: 'Ford',
          model: 'F-150 SuperCrew Cab XLT 4WD with Extended Range Battery',
        },
      ];

      const groups = component.groupedChips;

      expect(groups[0].models[0]).toBe(
        'F-150 SuperCrew Cab XLT 4WD with Extended Range Battery'
      );
    });

    it('should handle empty strings in selections', () => {
      component.selections = [{ manufacturer: '', model: '' }];

      const groups = component.groupedChips;

      expect(groups.length).toBe(1);
      expect(groups[0].manufacturer).toBe('');
      expect(groups[0].models).toEqual(['']);
    });

    it('should handle single character names', () => {
      component.selections = [
        { manufacturer: 'A', model: 'B' },
        { manufacturer: 'A', model: 'C' },
      ];

      const groups = component.groupedChips;

      expect(groups[0].manufacturer).toBe('A');
      expect(groups[0].models).toEqual(['B', 'C']);
    });
  });

  describe('Grouping Consistency', () => {
    it('should produce consistent groups for same selections', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Chevrolet', model: 'Corvette' },
      ];

      component.selections = selections;
      const groups1 = component.groupedChips;

      component.selections = [...selections]; // Same data, new array
      const groups2 = component.groupedChips;

      expect(groups1.length).toBe(groups2.length);
      expect(groups1[0].manufacturer).toBe(groups2[0].manufacturer);
    });

    it('should always sort manufacturers the same way', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Toyota', model: 'Camry' },
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Chevrolet', model: 'Corvette' },
      ];

      component.selections = selections;
      const groups = component.groupedChips;

      expect(groups.map((g) => g.manufacturer)).toEqual([
        'Chevrolet',
        'Ford',
        'Toyota',
      ]);
    });

    it('should always sort models within groups the same way', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'Mustang' },
        { manufacturer: 'Ford', model: 'Explorer' },
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      component.selections = selections;
      const groups = component.groupedChips;

      expect(groups[0].models).toEqual(['Explorer', 'F-150', 'Mustang']);
    });
  });

  describe('Type Safety', () => {
    it('should have correct ChipGroup interface structure', () => {
      component.selections = [{ manufacturer: 'Ford', model: 'F-150' }];

      const groups: ChipGroup[] = component.groupedChips;

      groups.forEach((group) => {
        expect(typeof group.manufacturer).toBe('string');
        expect(Array.isArray(group.models)).toBe(true);
        expect(typeof group.count).toBe('number');
      });
    });

    it('should emit ManufacturerModelSelection on removeModel', () => {
      let emittedValue: ManufacturerModelSelection | undefined;

      component.removeModel.subscribe((value) => {
        emittedValue = value;
      });

      component.onRemoveModel('Ford', 'F-150');

      expect(emittedValue).toBeDefined();
      expect(emittedValue?.manufacturer).toBe('Ford');
      expect(emittedValue?.model).toBe('F-150');
    });

    it('should emit string on removeManufacturer', () => {
      let emittedValue: string | undefined;

      component.removeManufacturer.subscribe((value) => {
        emittedValue = value;
      });

      component.onRemoveManufacturer('Ford');

      expect(emittedValue).toBe('Ford');
    });
  });

  describe('Performance', () => {
    it('should handle rapid selection changes efficiently', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        component.selections = [
          { manufacturer: `Mfr${i}`, model: `Model${i}` },
        ];

        const groups = component.groupedChips;
        expect(groups.length).toBe(1);
      }
    });

    it('should handle large manufacturer lists efficiently', () => {
      const selections: ManufacturerModelSelection[] = [];

      // 50 manufacturers with 5 models each
      for (let i = 0; i < 50; i++) {
        for (let j = 0; j < 5; j++) {
          selections.push({
            manufacturer: `Manufacturer${i.toString().padStart(2, '0')}`,
            model: `Model${j}`,
          });
        }
      }

      component.selections = selections;

      const startTime = performance.now();
      const groups = component.groupedChips;
      const endTime = performance.now();

      expect(groups.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});
