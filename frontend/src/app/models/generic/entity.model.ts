/**
 * Generic Entity Model
 *
 * Represents any domain object (Vehicle, Aircraft, Plant, etc.)
 * Uses TypeScript generics to maintain type safety while being domain-agnostic
 */

/**
 * Generic entity representing any domain object
 * @template T The domain-specific entity type
 */
export interface Entity<T = any> {
  [key: string]: any;           // Allow any properties for flexibility
  _meta?: EntityMetadata;       // Optional metadata
}

/**
 * Metadata attached to entities for tracking and debugging
 */
export interface EntityMetadata {
  id: string;                   // Unique identifier
  type: string;                 // Entity type ('vehicle', 'aircraft', 'flora', etc.)
  timestamp?: string;           // When retrieved/updated (ISO 8601)
  source?: string;              // Data source identifier
  version?: string;             // Entity schema version
}

/**
 * Generic detail/instance entity (like VIN instances, aircraft registrations, plant samples)
 * @template T The domain-specific instance type
 */
export interface EntityInstance<T = any> {
  [key: string]: any;
  _meta?: EntityInstanceMetadata;
}

/**
 * Metadata for entity instances
 */
export interface EntityInstanceMetadata {
  parentId: string;             // Parent entity ID
  instanceId: string;           // Instance unique ID
  type: string;                 // Instance type
  timestamp?: string;           // When created/retrieved
}

/**
 * Generic hierarchical selection (like manufacturer → model, family → genus → species)
 * Supports arbitrary depth hierarchies
 */
export interface HierarchicalSelection {
  path: string[];               // ['Ford', 'F-150'] or ['Rosaceae', 'Rosa', 'Rosa rugosa']
  display: string;              // 'Ford F-150' or 'Rosa rugosa'
  level: number;                // Depth in hierarchy (0-based)
  metadata?: {                  // Additional selection metadata
    [key: string]: any;
  };
}

/**
 * Type guard to check if an object is an Entity
 */
export function isEntity<T>(obj: any): obj is Entity<T> {
  return obj && typeof obj === 'object';
}

/**
 * Type guard to check if an Entity has metadata
 */
export function hasEntityMetadata<T>(entity: Entity<T>): entity is Entity<T> & { _meta: EntityMetadata } {
  return entity._meta !== undefined;
}
