import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ManufacturerModelSelection } from '../../../../models';

/**
 * Grouped chips for display
 * Groups models by manufacturer for hierarchical presentation
 */
export interface ChipGroup {
  manufacturer: string;
  models: string[];
  count: number;
}

/**
 * Selected Items Chips Component
 * 
 * Displays selected manufacturer-model combinations as hierarchical chips:
 * - Parent chip: Manufacturer name with count badge
 * - Child chips: Individual model names
 * 
 * Example:
 *   [Ford (3) ×]
 *     [F-150 ×] [Mustang ×] [Explorer ×]
 */
@Component({
  selector: 'app-selected-items-chips',
  templateUrl: './selected-items-chips.component.html',
  styleUrls: ['./selected-items-chips.component.scss']
})
export class SelectedItemsChipsComponent {
  /**
   * Array of selected manufacturer-model combinations
   */
  @Input() selections: ManufacturerModelSelection[] = [];

  /**
   * Emits when user removes a single model chip
   */
  @Output() removeModel = new EventEmitter<ManufacturerModelSelection>();

  /**
   * Emits when user removes entire manufacturer group
   */
  @Output() removeManufacturer = new EventEmitter<string>();

  /**
   * Group selections by manufacturer for hierarchical display
   * Returns array of chip groups with manufacturer + models
   */
  get groupedChips(): ChipGroup[] {
    const groups = new Map<string, string[]>();

    // Group models by manufacturer
    this.selections.forEach(selection => {
      if (!groups.has(selection.manufacturer)) {
        groups.set(selection.manufacturer, []);
      }
      groups.get(selection.manufacturer)!.push(selection.model);
    });

    // Convert to array and sort
    return Array.from(groups.entries())
      .map(([manufacturer, models]) => ({
        manufacturer,
        models: models.sort(),
        count: models.length
      }))
      .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
  }

  /**
   * Handle removal of individual model chip
   */
  onRemoveModel(manufacturer: string, model: string): void {
    this.removeModel.emit({ manufacturer, model });
  }

  /**
   * Handle removal of entire manufacturer group
   */
  onRemoveManufacturer(manufacturer: string): void {
    this.removeManufacturer.emit(manufacturer);
  }
}
