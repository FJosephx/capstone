import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HomePage } from './home.page';

@NgModule({
  imports: [IonicModule, CommonModule, RouterModule.forChild([{ path: '', component: HomePage }])],
  declarations: [HomePage]
})
export class HomePageModule {}
