import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mic-consent',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Permiso de Micrófono</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss(false)">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-text>
        <h2>Consentimiento para uso del micrófono</h2>
        <p>
          Para poder utilizar la función de dictado por voz, necesitamos acceso a tu micrófono.
          Esta función te permitirá:
        </p>
        <ul>
          <li>Dictar mensajes en lugar de escribirlos</li>
          <li>Convertir tu voz en texto automáticamente</li>
        </ul>
        <h3>¿Cómo usamos tu micrófono?</h3>
        <ul>
          <li>Solo se activa cuando presionas el botón de micrófono</li>
          <li>La grabación se detiene automáticamente al soltar el botón</li>
          <li>El audio se procesa localmente en tu dispositivo</li>
          <li>No almacenamos ninguna grabación de audio</li>
        </ul>
        <p>
          Puedes revocar este permiso en cualquier momento desde la configuración de tu navegador.
        </p>
      </ion-text>

      <div class="ion-text-center ion-padding-top">
        <ion-button color="primary" (click)="dismiss(true)">
          Aceptar y activar micrófono
        </ion-button>
        <ion-button color="medium" fill="clear" (click)="dismiss(false)">
          Ahora no
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h3 {
      font-size: 1.2rem;
      font-weight: 500;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }
    ul {
      padding-left: 1.2rem;
      margin-bottom: 1rem;
    }
    li {
      margin-bottom: 0.5rem;
    }
    .ion-padding-top {
      padding-top: 2rem;
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class MicConsentComponent {
  constructor(private modalCtrl: ModalController) {}

  dismiss(accepted: boolean) {
    this.modalCtrl.dismiss(accepted);
  }
}