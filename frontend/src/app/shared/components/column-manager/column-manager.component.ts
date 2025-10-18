import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { TransferItem } from 'ng-zorro-antd/transfer';
import { TableColumn } from '../../models/table-column.model';

@Component({
  selector: 'app-column-manager',
  templateUrl: './column-manager.component.html',
  styleUrls: ['./column-manager.component.scss'],
})
export class ColumnManagerComponent implements OnChanges {
  // ========== INPUTS ==========

  /** Drawer visibility */
  @Input() visible = false;

  /** Column definitions */
  @Input() columns: TableColumn[] = [];

  // ========== OUTPUTS ==========

  /** Emits when drawer visibility changes */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Emits when columns are modified */
  @Output() columnsChange = new EventEmitter<void>();

  // ========== STATE ==========

  /** Transfer data source */
  transferData: TransferItem[] = [];

  /** Search text for filtering columns */
  searchText = '';

  // ========== LIFECYCLE ==========

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns'] || changes['visible']) {
      this.initializeTransferData();
    }
  }

  // ========== INITIALIZATION ==========

  initializeTransferData(): void {
    this.transferData = this.columns.map((col) => ({
      key: col.key,
      title: col.label,
      description: this.getColumnDescription(col),
      direction: col.visible !== false ? 'right' : 'left',
      disabled: !col.hideable, // Required columns cannot be moved
    }));
  }

  getColumnDescription(column: TableColumn): string {
    const features: string[] = [];
    if (column.sortable) features.push('Sortable');
    if (column.filterable) features.push('Filterable');
    if (!column.hideable) features.push('Required');
    return features.join(', ') || 'Standard column';
  }

  // ========== DRAWER ACTIONS ==========

  onClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onCancel(): void {
    this.onClose();
  }

  onApply(): void {
    console.log('🔥🔥🔥 APPLY BUTTON CLICKED! 🔥🔥🔥');

    try {
      console.log('🎯 ColumnManager: onApply() START', {
        columnsBeforeUpdate: this.columns.map((c) => ({
          key: c.key,
          visible: c.visible,
        })),
        transferData: this.transferData.map((t) => ({
          key: t['key'],
          direction: t['direction'],
        })),
      });

      // Update column visibility based on transfer direction
      this.columns.forEach((col) => {
        const transferItem = this.transferData.find(
          (item) => item['key'] === col.key
        );
        if (transferItem) {
          console.log(
            `📝 Updating ${col.key}: ${col.visible} -> ${
              transferItem.direction === 'right'
            }`
          );
          col.visible = transferItem.direction === 'right';
        }
      });

      console.log('📝 ColumnManager: Columns updated', {
        columnsAfterUpdate: this.columns.map((c) => ({
          key: c.key,
          visible: c.visible,
        })),
      });

      // Validate dependencies
      this.validateDependencies();

      console.log('✅ ColumnManager: Emitting columnsChange event');

      // Emit changes
      this.columnsChange.emit();

      console.log('🚪 ColumnManager: Closing drawer');

      // Close drawer
      this.onClose();

      console.log('✅ ColumnManager: onApply() COMPLETE');
    } catch (error) {
      console.error('❌ ERROR in onApply():', error);
    }
  }
  onReset(): void {
    // Reset all columns to default visibility
    this.columns.forEach((col) => {
      col.visible = col.hideable ? undefined : true;
    });

    // Reinitialize transfer data
    this.initializeTransferData();

    // Emit changes
    this.columnsChange.emit();
  }

  // ========== TRANSFER ACTIONS ==========

  onTransferChange(event: any): void {
    // Event format: { from: 'left'|'right', to: 'left'|'right', list: Array }
    console.log('Transfer change:', event);

    // The nz-transfer component emits changes, but we need to update our data
    // The transfer component modifies the direction property automatically
    // We just log for debugging purposes
  }

  filterOption = (inputValue: string, item: TransferItem): boolean => {
    return item.title.toLowerCase().includes(inputValue.toLowerCase());
  };

  // ========== VALIDATION ==========

  validateDependencies(): void {
    // If a column has dependencies, ensure they are visible
    this.columns.forEach((col) => {
      if (col.visible !== false && col.dependencies) {
        col.dependencies.forEach((depKey) => {
          const depCol = this.columns.find((c) => c.key === depKey);
          if (depCol) {
            depCol.visible = true;
            // Update transfer data
            const transferItem = this.transferData.find(
              (item) => item['key'] === depKey
            );
            if (transferItem) {
              transferItem.direction = 'right';
            }
          }
        });
      }
    });
  }

  // ========== HELPER METHODS ==========

  getVisibleCount(): number {
    return this.columns.filter((col) => col.visible !== false).length;
  }

  getHiddenCount(): number {
    return this.columns.filter((col) => col.visible === false).length;
  }

  getTotalCount(): number {
    return this.columns.length;
  }

  canReset(): boolean {
    // Check if any columns have been modified from default state
    return this.columns.some((col) => {
      if (col.hideable) {
        return col.visible !== undefined;
      }
      return false;
    });
  }
}
