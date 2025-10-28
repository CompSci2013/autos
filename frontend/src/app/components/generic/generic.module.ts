import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// NG-ZORRO imports
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTreeModule } from 'ng-zorro-antd/tree';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTagModule } from 'ng-zorro-antd/tag';

// Components
import { GenericHierarchicalPickerComponent } from './generic-hierarchical-picker/generic-hierarchical-picker.component';
import { GenericResultsTableComponent } from './generic-results-table/generic-results-table.component';
import { GenericDiscoveryPageComponent } from './generic-discovery-page/generic-discovery-page.component';

/**
 * Generic Module
 *
 * Contains configuration-driven generic components that work across domains.
 * Components adapt their behavior based on domain configuration JSON.
 *
 * Components:
 * - GenericHierarchicalPickerComponent: Multi-level hierarchy picker (tree/table modes)
 * - GenericResultsTableComponent: Results table with expandable rows for instances
 * - GenericDiscoveryPageComponent: Main container page combining picker and results
 *
 * Usage:
 * Import this module in AppModule or lazy-loaded feature modules.
 */
@NgModule({
  declarations: [
    GenericHierarchicalPickerComponent,
    GenericResultsTableComponent,
    GenericDiscoveryPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    // NG-ZORRO modules
    NzCardModule,
    NzTableModule,
    NzTreeModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    NzEmptyModule,
    NzAlertModule,
    NzBadgeModule,
    NzTagModule
  ],
  exports: [
    GenericHierarchicalPickerComponent,
    GenericResultsTableComponent,
    GenericDiscoveryPageComponent
  ]
})
export class GenericModule {}
