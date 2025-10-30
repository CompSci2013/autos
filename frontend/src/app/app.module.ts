import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { GridsterModule } from 'angular-gridster2';

// NG-ZORRO imports
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

// Import icon definitions
import {
  HomeOutline,
  SearchOutline,
  ExperimentOutline,
  DragOutline,
  CaretRightOutline,
  CaretDownOutline,
  SettingOutline,
  ReloadOutline,
  FilterOutline,
  UpOutline,
  DownOutline,
  CloseCircleOutline,
  CloseOutline,
  InboxOutline,
  ExportOutline,
  LineChartOutline,
} from '@ant-design/icons-angular/icons';

// Register icons
const icons = [
  HomeOutline,
  SearchOutline,
  ExperimentOutline,
  DragOutline,
  CaretRightOutline,
  CaretDownOutline,
  SettingOutline,
  ReloadOutline,
  FilterOutline,
  UpOutline,
  DownOutline,
  CloseCircleOutline,
  CloseOutline,
  InboxOutline,
  ExportOutline,
  LineChartOutline,
];

// Angular CDK
import { DragDropModule } from '@angular/cdk/drag-drop';

// Shared Module (contains BaseDataTableComponent)
import { SharedModule } from './shared/shared.module';

// Feature components
import { TablePickerComponent } from './features/picker/table-picker/table-picker.component';
import { SelectedItemsChipsComponent } from './features/picker/table-picker/selected-items-chips/selected-items-chips.component';
import { DiscoverComponent } from './features/discover/discover.component';
import { ResultsTableComponent } from './features/results/results-table/results-table.component';
import { WorkshopComponent } from './features/workshop/workshop.component';
import { HomeComponent } from './features/home/home.component';
import { NavigationComponent } from './core/navigation/navigation.component';
import { PanelPopoutComponent } from './features/panel-popout/panel-popout.component';

@NgModule({
  declarations: [
    AppComponent,
    TablePickerComponent,
    SelectedItemsChipsComponent,
    DiscoverComponent,
    ResultsTableComponent,
    WorkshopComponent,
    HomeComponent,
    NavigationComponent,
    PanelPopoutComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    // NG-ZORRO modules
    NzTableModule,
    NzCheckboxModule,
    NzToolTipModule,
    NzIconModule.forRoot(icons),
    NzEmptyModule,
    NzTagModule,
    NzSpinModule,
    NzRateModule,
    NzAlertModule,
    NzCollapseModule,
    NzButtonModule,
    NzMenuModule,
    NzTabsModule,
    // Angular CDK
    DragDropModule,
    // Grid Layout
    GridsterModule,
    // Shared Module (BaseDataTableComponent)
    SharedModule,
  ],
  providers: [{ provide: NZ_I18N, useValue: en_US }],
  bootstrap: [AppComponent],
})
export class AppModule {}
