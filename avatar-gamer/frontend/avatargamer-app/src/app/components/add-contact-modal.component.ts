import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { UserLinkService } from '../services/user-link.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-contact-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Solicitar Vinculación</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>
        <ion-item>
          <ion-label position="stacked">ID de Usuario</ion-label>
          <ion-input type="number" [(ngModel)]="userId" placeholder="Ingrese ID de usuario"></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="stacked">Mensaje (opcional)</ion-label>
          <ion-textarea
            [(ngModel)]="message"
            placeholder="Añade un mensaje para el usuario"
            [rows]="3"
            maxlength="200"
          ></ion-textarea>
        </ion-item>
      </ion-list>

      <div class="ion-padding">
        <ion-button expand="block" (click)="sendLinkRequest()" [disabled]="!userId">
          Enviar Solicitud
        </ion-button>
      </div>
      
      <div class="ion-padding ion-text-center">
        <ion-text color="medium">
          <p>Se enviará una solicitud al usuario. El usuario debe aprobarla antes de establecer la vinculación.</p>
        </ion-text>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar {
      --border-width: 0;
      --background: var(--ion-color-primary);
    }
    
    ion-content {
      --padding-top: var(--ag-space-lg);
      --padding-bottom: var(--ag-space-lg);
    }
    
    ion-list {
      background: transparent;
      padding: 0;
    }
    
    ion-item {
      --border-radius: var(--ag-border-radius-md);
      --background: rgba(var(--ion-color-light-rgb), 0.5);
      margin-bottom: var(--ag-space-md);
      
      ion-label {
        font-weight: var(--ag-font-weight-medium);
      }
      
      ion-input, ion-textarea {
        --padding-start: var(--ag-space-sm);
        margin-top: var(--ag-space-xs);
      }
    }
    
    ion-button {
      margin-top: var(--ag-space-md);
      --border-radius: var(--ag-border-radius-md);
      height: 48px;
      font-weight: var(--ag-font-weight-medium);
    }
    
    .ion-text-center p {
      font-size: var(--ag-font-size-sm);
      color: var(--ion-color-medium);
      margin: var(--ag-space-md) 0;
      line-height: 1.5;
    }
  `]
})
export class AddContactModalComponent implements OnInit {
  userId: number | null = null;
  message: string = '';

  constructor(
    private modalCtrl: ModalController,
    private userLinkService: UserLinkService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {}

  dismiss(data?: any) {
    this.modalCtrl.dismiss(data);
  }

  async sendLinkRequest() {
    if (!this.userId) return;

    try {
      // Usar el nuevo método para crear una solicitud de vinculación
      const response = await this.userLinkService.createLinkRequest(
        this.userId, 
        this.message || undefined
      ).toPromise();
      
      this.dismiss({ 
        success: true, 
        requestId: response?.request_id,
        status: response?.status 
      });
      
      // Mostrar mensaje de éxito
      const alert = await this.alertCtrl.create({
        header: 'Solicitud Enviada',
        message: 'La solicitud de vinculación ha sido enviada al usuario. Recibirás una notificación cuando sea aprobada o rechazada.',
        buttons: ['OK']
      });
      await alert.present();
    } catch (error: any) {
      console.error('Error al enviar solicitud de vinculación:', error);
      
      // Mostrar mensaje de error
      let errorMessage = 'No se pudo enviar la solicitud';
      
      if (error.error && error.error.detail) {
        errorMessage = error.error.detail;
      } else if (error.error && error.error.user_id) {
        errorMessage = error.error.user_id;
      }
      
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: errorMessage,
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}