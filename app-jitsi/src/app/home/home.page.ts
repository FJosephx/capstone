import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// 👇 importa el componente standalone de la videollamada
import { JitsiCallComponent } from '../jitsi/jitsi-call.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, JitsiCallComponent],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {

  // 👇 props que usaremos en el HTML
  roomName = 'sala-prueba';
  displayName = 'Operador PC';
  robotId = 1;

  constructor() {}
}
