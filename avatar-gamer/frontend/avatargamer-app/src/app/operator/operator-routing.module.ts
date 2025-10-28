import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OperatorPage } from './operator.page';

const routes: Routes = [
  {
    path: '',
    component: OperatorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OperatorPageRoutingModule {}
