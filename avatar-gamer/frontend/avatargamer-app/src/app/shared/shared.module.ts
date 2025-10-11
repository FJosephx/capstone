import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { LinkRequestsListComponent } from '../components/link-requests-list.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LinkRequestsListComponent // Importamos el componente standalone
  ],
  exports: [
    // Exportamos el componente para que esté disponible en los módulos que importen este módulo
    LinkRequestsListComponent
  ]
})
export class SharedModule { }