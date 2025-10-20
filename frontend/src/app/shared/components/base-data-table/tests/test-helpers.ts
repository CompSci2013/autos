import { DebugElement } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TableColumn } from '../../../models/table-column.model';
import { VehicleResult } from '../../../../models/vehicle-result.model';

/**
 * Test helper utilities for BaseDataTableComponent tests
 */

/**
 * Create a basic set of table columns for testing
 */
export function createTestColumns(): TableColumn<VehicleResult>[] {
  return [
    {
      key: 'vehicle_id',
      label: 'ID',
      sortable: false,
      filterable: false,
      hideable: false
    },
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      sortable: true,
      filterable: true,
      hideable: true
    },
    {
      key: 'model',
      label: 'Model',
      sortable: true,
      filterable: true,
      hideable: true
    },
    {
      key: 'year',
      label: 'Year',
      sortable: true,
      filterable: true,
      hideable: true
    },
    {
      key: 'body_class',
      label: 'Body Class',
      sortable: true,
      filterable: true,
      hideable: true
    }
  ];
}

/**
 * Find an element by CSS selector
 */
export function findByCss<T>(
  fixture: ComponentFixture<T>,
  selector: string
): DebugElement {
  return fixture.debugElement.query(By.css(selector));
}

/**
 * Find all elements by CSS selector
 */
export function findAllByCss<T>(
  fixture: ComponentFixture<T>,
  selector: string
): DebugElement[] {
  return fixture.debugElement.queryAll(By.css(selector));
}

/**
 * Get text content from an element
 */
export function getTextContent(element: DebugElement): string {
  return element.nativeElement.textContent.trim();
}

/**
 * Trigger input event on an element
 */
export function setInputValue(
  element: DebugElement,
  value: string
): void {
  const input = element.nativeElement as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

/**
 * Click an element
 */
export function clickElement(element: DebugElement): void {
  element.nativeElement.click();
}

/**
 * Wait for async operations (useful with fakeAsync)
 */
export function flushMicrotasks(): void {
  // This is typically used with flush() from @angular/core/testing
}
