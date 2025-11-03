/**
 * Picker Configuration Service
 *
 * Central registry for picker configurations.
 * Manages registration, retrieval, and validation of PickerConfig instances.
 *
 * Usage:
 *   1. Register configurations at app startup (app.module.ts or feature modules)
 *   2. Components retrieve configs by ID
 *   3. Service validates configurations at registration time
 */

import { Injectable } from '@angular/core';
import { PickerConfig } from '../../shared/models/picker-config.model';

/**
 * Configuration validation error
 */
export class PickerConfigError extends Error {
  constructor(configId: string, message: string) {
    super(`[PickerConfigService] Configuration '${configId}': ${message}`);
    this.name = 'PickerConfigError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class PickerConfigService {
  /**
   * Registry of picker configurations
   * Key: config.id, Value: PickerConfig<T>
   */
  private configs = new Map<string, PickerConfig<any>>();

  constructor() {
    console.log('[PickerConfigService] Initialized');
  }

  /**
   * Register a picker configuration
   *
   * @param config Picker configuration to register
   * @throws PickerConfigError if configuration is invalid or ID already exists
   */
  registerConfig<T>(config: PickerConfig<T>): void {
    // Validate configuration
    this.validateConfig(config);

    // Check for duplicate ID
    if (this.configs.has(config.id)) {
      throw new PickerConfigError(
        config.id,
        'Configuration with this ID already exists. Use a unique ID.'
      );
    }

    // Register
    this.configs.set(config.id, config);
    console.log(
      `[PickerConfigService] Registered configuration: ${config.id} (${config.displayName})`
    );
  }

  /**
   * Register multiple picker configurations
   *
   * @param configs Array of picker configurations
   */
  registerConfigs(configs: PickerConfig<any>[]): void {
    configs.forEach((config) => this.registerConfig(config));
  }

  /**
   * Get a picker configuration by ID
   *
   * @param id Configuration ID
   * @returns Picker configuration
   * @throws PickerConfigError if configuration not found
   */
  getConfig<T>(id: string): PickerConfig<T> {
    const config = this.configs.get(id);
    if (!config) {
      throw new PickerConfigError(
        id,
        `Configuration not found. Available configurations: ${Array.from(
          this.configs.keys()
        ).join(', ')}`
      );
    }
    return config;
  }

  /**
   * Get all registered picker configurations
   *
   * @returns Array of all picker configurations
   */
  getAllConfigs(): PickerConfig<any>[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get all registered configuration IDs
   *
   * @returns Array of configuration IDs
   */
  getConfigIds(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Check if a configuration is registered
   *
   * @param id Configuration ID
   * @returns True if configuration exists
   */
  hasConfig(id: string): boolean {
    return this.configs.has(id);
  }

  /**
   * Unregister a picker configuration
   * Useful for testing or dynamic configuration management
   *
   * @param id Configuration ID
   * @returns True if configuration was removed, false if not found
   */
  unregisterConfig(id: string): boolean {
    const result = this.configs.delete(id);
    if (result) {
      console.log(`[PickerConfigService] Unregistered configuration: ${id}`);
    }
    return result;
  }

  /**
   * Clear all registered configurations
   * Useful for testing
   */
  clearAll(): void {
    this.configs.clear();
    console.log('[PickerConfigService] Cleared all configurations');
  }

  /**
   * Validate a picker configuration
   *
   * @param config Configuration to validate
   * @throws PickerConfigError if validation fails
   */
  private validateConfig<T>(config: PickerConfig<T>): void {
    const errors: string[] = [];

    // Required fields
    if (!config.id || typeof config.id !== 'string') {
      errors.push('id is required and must be a string');
    }
    if (!config.displayName || typeof config.displayName !== 'string') {
      errors.push('displayName is required and must be a string');
    }
    if (!Array.isArray(config.columns) || config.columns.length === 0) {
      errors.push('columns is required and must be a non-empty array');
    }
    if (!config.api || typeof config.api !== 'object') {
      errors.push('api configuration is required');
    } else {
      if (!config.api.method || typeof config.api.method !== 'string') {
        errors.push('api.method is required and must be a string');
      }
      if (
        !config.api.responseTransformer ||
        typeof config.api.responseTransformer !== 'function'
      ) {
        errors.push('api.responseTransformer is required and must be a function');
      }
    }
    if (!config.row || typeof config.row !== 'object') {
      errors.push('row configuration is required');
    } else {
      if (!config.row.keyGenerator || typeof config.row.keyGenerator !== 'function') {
        errors.push('row.keyGenerator is required and must be a function');
      }
      if (!config.row.keyParser || typeof config.row.keyParser !== 'function') {
        errors.push('row.keyParser is required and must be a function');
      }
    }
    if (!config.selection || typeof config.selection !== 'object') {
      errors.push('selection configuration is required');
    } else {
      if (!config.selection.urlParam || typeof config.selection.urlParam !== 'string') {
        errors.push('selection.urlParam is required and must be a string');
      }
      if (
        !config.selection.serializer ||
        typeof config.selection.serializer !== 'function'
      ) {
        errors.push('selection.serializer is required and must be a function');
      }
      if (
        !config.selection.deserializer ||
        typeof config.selection.deserializer !== 'function'
      ) {
        errors.push('selection.deserializer is required and must be a function');
      }
    }
    if (!config.pagination || typeof config.pagination !== 'object') {
      errors.push('pagination configuration is required');
    } else {
      if (!['client', 'server'].includes(config.pagination.mode)) {
        errors.push("pagination.mode must be 'client' or 'server'");
      }
      if (
        typeof config.pagination.defaultPageSize !== 'number' ||
        config.pagination.defaultPageSize <= 0
      ) {
        errors.push('pagination.defaultPageSize must be a positive number');
      }
      if (
        !Array.isArray(config.pagination.pageSizeOptions) ||
        config.pagination.pageSizeOptions.length === 0
      ) {
        errors.push('pagination.pageSizeOptions must be a non-empty array');
      }
    }

    // Validation warnings (not errors)
    if (config.pagination?.mode === 'client') {
      if (!config.filtering) {
        console.warn(
          `[PickerConfigService] Configuration '${config.id}': Client-side pagination mode but no filtering configuration provided. Client-side filtering will not work.`
        );
      }
      if (!config.sorting) {
        console.warn(
          `[PickerConfigService] Configuration '${config.id}': Client-side pagination mode but no sorting configuration provided. Client-side sorting will not work.`
        );
      }
    }

    // Throw if any errors
    if (errors.length > 0) {
      throw new PickerConfigError(
        config.id || 'unknown',
        `Validation failed:\n  - ${errors.join('\n  - ')}`
      );
    }
  }
}
