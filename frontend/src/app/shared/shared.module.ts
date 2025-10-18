import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

// NG-ZORRO Imports
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTransferModule } from 'ng-zorro-antd/transfer';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { BaseDataTableComponent } from './components/base-data-table/base-data-table.component';
import { ColumnManagerComponent } from './components/column-manager/column-manager.component';

@NgModule({
  declarations: [BaseDataTableComponent, ColumnManagerComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzDrawerModule,
    NzTransferModule,
    NzToolTipModule,
    NzEmptyModule,
    NzSpinModule,
    NzAlertModule,
    NzTagModule,
  ],
  exports: [
    // Export our components
    BaseDataTableComponent,
    ColumnManagerComponent,
    // Also export NG-ZORRO modules for convenience
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzDrawerModule,
    NzTransferModule,
    NzToolTipModule,
    NzEmptyModule,
    NzSpinModule,
    NzAlertModule,
    NzTagModule,
  ],
})
export class SharedModule {}
