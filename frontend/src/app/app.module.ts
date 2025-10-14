import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

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

// Feature components
import { ManufacturerModelTablePickerComponent } from './features/picker/manufacturer-model-table-picker/manufacturer-model-table-picker.component';
import { DiscoverComponent } from './features/discover/discover.component';
import { VehicleResultsTableComponent } from './features/results/vehicle-results-table/vehicle-results-table.component';

@NgModule({
  declarations: [
    AppComponent,
    ManufacturerModelTablePickerComponent,
    DiscoverComponent,
    VehicleResultsTableComponent
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
    NzIconModule,
    NzEmptyModule,
    NzTagModule,
    NzSpinModule,
    NzRateModule,
    NzAlertModule
  ],
  providers: [
    { provide: NZ_I18N, useValue: en_US }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }