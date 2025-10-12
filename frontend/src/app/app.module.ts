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

// Feature components
import { ManufacturerModelTablePickerComponent } from './features/picker/manufacturer-model-table-picker/manufacturer-model-table-picker.component';
import { DiscoverComponent } from './features/discover/discover.component';

@NgModule({
  declarations: [
    AppComponent,
    ManufacturerModelTablePickerComponent,
    DiscoverComponent
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
    NzIconModule
  ],
  providers: [
    { provide: NZ_I18N, useValue: en_US }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
