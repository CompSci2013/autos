import {
  Entity,
  EntityInstance,
  HierarchicalSelection,
  isEntity,
  isEntityInstance,
  createEntity,
  createEntityInstance
} from './entity.model';

describe('Entity Model', () => {
  describe('Entity interface', () => {
    it('should create a valid entity', () => {
      const entity: Entity = {
        _meta: {
          id: 'test-id',
          type: 'test',
          source: 'test-source',
          timestamp: '2025-10-28T00:00:00Z'
        }
      };

      expect(entity._meta.id).toBe('test-id');
      expect(entity._meta.type).toBe('test');
    });

    it('should allow generic entity with custom fields', () => {
      interface VehicleEntity extends Entity {
        manufacturer: string;
        model: string;
        year: number;
      }

      const vehicle: VehicleEntity = {
        manufacturer: 'Ford',
        model: 'F-150',
        year: 2020,
        _meta: {
          id: 'vehicle-1',
          type: 'vehicle',
          source: 'NHTSA',
          timestamp: '2025-10-28T00:00:00Z'
        }
      };

      expect(vehicle.manufacturer).toBe('Ford');
      expect(vehicle.model).toBe('F-150');
      expect(vehicle.year).toBe(2020);
    });
  });

  describe('EntityInstance interface', () => {
    it('should create a valid entity instance', () => {
      const instance: EntityInstance = {
        _meta: {
          instanceId: 'instance-1',
          entityId: 'entity-1',
          timestamp: '2025-10-28T00:00:00Z'
        }
      };

      expect(instance._meta.instanceId).toBe('instance-1');
      expect(instance._meta.entityId).toBe('entity-1');
    });

    it('should allow generic instance with custom fields', () => {
      interface VehicleInstance extends EntityInstance {
        vin: string;
        state: string;
        color: string;
      }

      const instance: VehicleInstance = {
        vin: '1HGBH41JXMN109186',
        state: 'CA',
        color: 'Blue',
        _meta: {
          instanceId: 'inst-1',
          entityId: 'vehicle-1',
          timestamp: '2025-10-28T00:00:00Z'
        }
      };

      expect(instance.vin).toBe('1HGBH41JXMN109186');
      expect(instance.state).toBe('CA');
    });
  });

  describe('HierarchicalSelection', () => {
    it('should create a valid hierarchical selection', () => {
      const selection: HierarchicalSelection = {
        path: ['Ford', 'F-150'],
        display: 'Ford F-150',
        level: 1
      };

      expect(selection.path).toEqual(['Ford', 'F-150']);
      expect(selection.display).toBe('Ford F-150');
      expect(selection.level).toBe(1);
    });

    it('should support multi-level hierarchy', () => {
      const selection: HierarchicalSelection = {
        path: ['Boeing', '737', '737-800'],
        display: 'Boeing 737 737-800',
        level: 2
      };

      expect(selection.path.length).toBe(3);
      expect(selection.level).toBe(2);
    });
  });

  describe('isEntity type guard', () => {
    it('should return true for valid entity', () => {
      const entity = {
        _meta: {
          id: 'test-id',
          type: 'test',
          source: 'test-source',
          timestamp: '2025-10-28T00:00:00Z'
        }
      };

      expect(isEntity(entity)).toBe(true);
    });

    it('should return false for invalid entity (missing _meta)', () => {
      const notEntity = {
        manufacturer: 'Ford',
        model: 'F-150'
      };

      expect(isEntity(notEntity)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isEntity(null)).toBe(false);
      expect(isEntity(undefined)).toBe(false);
    });

    it('should return false for invalid _meta structure', () => {
      const invalidEntity = {
        _meta: {
          id: 'test-id'
          // missing required fields
        }
      };

      expect(isEntity(invalidEntity)).toBe(false);
    });
  });

  describe('isEntityInstance type guard', () => {
    it('should return true for valid entity instance', () => {
      const instance = {
        _meta: {
          instanceId: 'inst-1',
          entityId: 'entity-1',
          timestamp: '2025-10-28T00:00:00Z'
        }
      };

      expect(isEntityInstance(instance)).toBe(true);
    });

    it('should return false for invalid instance (missing _meta)', () => {
      const notInstance = {
        vin: '1HGBH41JXMN109186'
      };

      expect(isEntityInstance(notInstance)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isEntityInstance(null)).toBe(false);
      expect(isEntityInstance(undefined)).toBe(false);
    });
  });

  describe('createEntity helper', () => {
    it('should create entity with proper metadata', () => {
      const data = {
        manufacturer: 'Ford',
        model: 'F-150',
        year: 2020
      };

      const entity = createEntity(data, 'vehicle-1', 'vehicle', 'NHTSA');

      expect(entity._meta.id).toBe('vehicle-1');
      expect(entity._meta.type).toBe('vehicle');
      expect(entity._meta.source).toBe('NHTSA');
      expect(entity._meta.timestamp).toBeDefined();
      expect((entity as any).manufacturer).toBe('Ford');
      expect((entity as any).model).toBe('F-150');
    });

    it('should generate timestamp if not provided', () => {
      const entity = createEntity({}, 'test-id', 'test', 'test-source');

      expect(entity._meta.timestamp).toBeDefined();
      expect(new Date(entity._meta.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('createEntityInstance helper', () => {
    it('should create entity instance with proper metadata', () => {
      const data = {
        vin: '1HGBH41JXMN109186',
        state: 'CA'
      };

      const instance = createEntityInstance(data, 'inst-1', 'entity-1');

      expect(instance._meta.instanceId).toBe('inst-1');
      expect(instance._meta.entityId).toBe('entity-1');
      expect(instance._meta.timestamp).toBeDefined();
      expect((instance as any).vin).toBe('1HGBH41JXMN109186');
    });

    it('should generate timestamp if not provided', () => {
      const instance = createEntityInstance({}, 'inst-1', 'entity-1');

      expect(instance._meta.timestamp).toBeDefined();
      expect(new Date(instance._meta.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
