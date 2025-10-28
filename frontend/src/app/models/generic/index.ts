/**
 * Generic Models Barrel Export
 *
 * Provides clean imports for all generic/domain-agnostic models
 *
 * @example
 * import { Entity, DomainFilters, DomainConfig, GenericDataSource } from '@app/models/generic';
 */

// Entity models
export * from './entity.model';

// Filter models
export * from './domain-filters.model';

// Configuration schema
export * from './domain-config.interface';

// Data source models
export * from './generic-data-source.model';
