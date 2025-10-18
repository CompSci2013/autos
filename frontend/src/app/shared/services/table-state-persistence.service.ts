import { Injectable } from '@angular/core';

/**
 * Service for persisting table state to localStorage
 * Handles column order, visibility, and other UI preferences
 */
@Injectable({
  providedIn: 'root',
})
export class TableStatePersistenceService {
  private readonly storagePrefix = 'autos-table-';

  /**
   * Save table preferences to localStorage
   * @param tableId Unique identifier for the table
   * @param preferences Preferences object to save
   */
  savePreferences(tableId: string, preferences: TablePreferences): void {
    const key = this.getStorageKey(tableId);
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save table preferences:', error);
    }
  }

  /**
   * Load table preferences from localStorage
   * @param tableId Unique identifier for the table
   * @returns Preferences object or null if not found
   */
  loadPreferences(tableId: string): TablePreferences | null {
    const key = this.getStorageKey(tableId);
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load table preferences:', error);
      return null;
    }
  }

  /**
   * Reset table preferences (remove from localStorage)
   * @param tableId Unique identifier for the table
   */
  resetPreferences(tableId: string): void {
    const key = this.getStorageKey(tableId);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to reset table preferences:', error);
    }
  }

  /**
   * Export preferences as JSON string
   * @param tableId Unique identifier for the table
   * @returns JSON string or null if not found
   */
  exportPreferences(tableId: string): string | null {
    const preferences = this.loadPreferences(tableId);
    return preferences ? JSON.stringify(preferences, null, 2) : null;
  }

  /**
   * Import preferences from JSON string
   * @param tableId Unique identifier for the table
   * @param json JSON string to import
   * @returns true if successful, false otherwise
   */
  importPreferences(tableId: string, json: string): boolean {
    try {
      const preferences = JSON.parse(json) as TablePreferences;
      this.savePreferences(tableId, preferences);
      return true;
    } catch (error) {
      console.error('Failed to import table preferences:', error);
      return false;
    }
  }

  /**
   * Get the localStorage key for a table
   * @param tableId Unique identifier for the table
   * @returns Full localStorage key
   */
  private getStorageKey(tableId: string): string {
    return `${this.storagePrefix}${tableId}-preferences`;
  }
}

/**
 * Structure of table preferences stored in localStorage
 */
export interface TablePreferences {
  /** Ordered array of column keys */
  columnOrder: string[];

  /** Array of visible column keys */
  visibleColumns: string[];

  /** Preferred page size */
  pageSize?: number;

  /** Last updated timestamp */
  lastUpdated?: number;
}
