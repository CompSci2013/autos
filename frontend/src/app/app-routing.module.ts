import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { DiscoverComponent } from './features/discover/discover.component';
import { WorkshopComponent } from './features/workshop/workshop.component';
import { PanelPopoutComponent } from './features/panel-popout/panel-popout.component';
import { GenericDiscoveryPageComponent } from './components/generic';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'discover', component: DiscoverComponent },
  { path: 'generic-discover', component: GenericDiscoveryPageComponent },
  { path: 'workshop', component: WorkshopComponent },
  { path: 'panel/:gridId/:panelId/:type', component: PanelPopoutComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
