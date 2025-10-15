import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { DiscoverComponent } from './features/discover/discover.component';
import { WorkshopComponent } from './features/workshop/workshop.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'discover', component: DiscoverComponent },
  { path: 'workshop', component: WorkshopComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
