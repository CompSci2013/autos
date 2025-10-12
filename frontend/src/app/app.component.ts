import { Component } from '@angular/core';
import { ManufacturerModelSelection } from './models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'AUTOS';

  onSelectionChange(selections: ManufacturerModelSelection[]): void {
    console.log('Selected manufacturer-model combinations:', selections);
    console.log(`Total selections: ${selections.length}`);
  }
}
