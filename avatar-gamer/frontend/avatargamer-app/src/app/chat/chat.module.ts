import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ChatPage } from './chat.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatPage,  // Importamos el componente si es standalone
    RouterModule.forChild([
      {
        path: '',
        component: ChatPage
      }
    ])
  ]  // Quitamos la declaración si es standalone
})
export class ChatModule {}