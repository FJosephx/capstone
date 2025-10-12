import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { JitsiCallPage } from './jitsi-call.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    JitsiCallPage,  // Importamos el componente si es standalone
    RouterModule.forChild([
      {
        path: ':roomName',
        component: JitsiCallPage
      }
    ])
  ]  // Quitamos la declaración si es standalone
})
export class JitsiCallModule {}