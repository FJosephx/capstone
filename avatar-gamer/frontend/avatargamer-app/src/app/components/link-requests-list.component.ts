import { Component, OnInit, Input } from '@angular/core';
import { AlertController, LoadingController, IonicModule } from '@ionic/angular';
import { UserLinkService, LinkRequest } from '../services/user-link.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-link-requests-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-list *ngIf="!isLoading && linkRequests.length > 0">
      <ion-list-header>
        <ion-label>Solicitudes de Vinculación {{ isUserView ? 'Recibidas' : 'Enviadas' }}</ion-label>
      </ion-list-header>
      
      <ion-item *ngFor="let request of linkRequests">
        <ion-label>
          <h2>{{ isUserView ? request.operator_username : request.user_username }}</h2>
          <p *ngIf="request.message">{{ request.message }}</p>
          <p>
            <ion-text [color]="getStatusColor(request.status)">
              Estado: {{ getStatusText(request.status) }}
            </ion-text>
          </p>
          <p>Fecha: {{ request.created_at | date:'medium' }}</p>
        </ion-label>
        
        <div slot="end" *ngIf="isUserView && request.status === 'pending'">
          <ion-button (click)="respondToRequest(request, 'approved')" color="success">
            <ion-icon name="checkmark"></ion-icon>
            Aceptar
          </ion-button>
          <ion-button (click)="respondToRequest(request, 'rejected')" color="danger">
            <ion-icon name="close"></ion-icon>
            Rechazar
          </ion-button>
        </div>
        
        <ion-badge slot="end" *ngIf="!isUserView || request.status !== 'pending'" [color]="getStatusColor(request.status)">
          {{ getStatusText(request.status) }}
        </ion-badge>
      </ion-item>
    </ion-list>
    
    <div *ngIf="!isLoading && linkRequests.length === 0" class="ion-text-center ion-padding">
      <ion-text color="medium">
        <p>No hay solicitudes de vinculación {{ isUserView ? 'recibidas' : 'enviadas' }}.</p>
      </ion-text>
    </div>
    
    <div *ngIf="isLoading" class="ion-text-center ion-padding">
      <ion-spinner></ion-spinner>
      <p>Cargando solicitudes...</p>
    </div>
    
    <div *ngIf="error" class="ion-text-center ion-padding">
      <ion-text color="danger">
        <p>{{ error }}</p>
      </ion-text>
      <ion-button (click)="loadRequests()" fill="clear">
        Reintentar
      </ion-button>
    </div>
  `,
  styles: [`
    ion-list {
      background: transparent;
      padding: var(--ag-space-xs);
    }
    
    ion-list-header {
      padding-left: var(--ag-space-sm);
      
      ion-label {
        font-family: var(--ag-font-display);
        font-weight: var(--ag-font-weight-bold);
        font-size: var(--ag-font-size-lg);
        color: var(--ion-color-primary);
      }
    }
    
    ion-item {
      --border-radius: var(--ag-border-radius-md);
      --background: var(--ion-card-background);
      margin-bottom: var(--ag-space-sm);
      box-shadow: var(--ag-shadow-xs);
      
      h2 {
        font-weight: var(--ag-font-weight-medium);
        margin-bottom: var(--ag-space-xs);
      }
      
      p {
        margin-bottom: var(--ag-space-xxs);
      }
    }
    
    ion-badge {
      padding: var(--ag-space-xs) var(--ag-space-sm);
      border-radius: var(--ag-border-radius-md);
      font-weight: var(--ag-font-weight-medium);
    }
    
    .ion-text-center {
      padding: var(--ag-space-xl);
      background: rgba(var(--ion-color-light-rgb), 0.3);
      border-radius: var(--ag-border-radius-lg);
      margin: var(--ag-space-md) 0;
      
      ion-spinner {
        margin-bottom: var(--ag-space-sm);
      }
      
      p {
        margin: var(--ag-space-xs) 0;
        color: var(--ion-color-medium);
      }
    }
  `]
})
export class LinkRequestsListComponent implements OnInit {
  @Input() isUserView: boolean = true;
  @Input() status: string | null = null; // 'pending', 'approved', 'rejected' o null para todos
  
  linkRequests: LinkRequest[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private userLinkService: UserLinkService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.loadRequests();
  }

  async loadRequests() {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = this.isUserView ? 
        await this.userLinkService.getReceivedLinkRequests(this.status || undefined).toPromise() :
        await this.userLinkService.getSentLinkRequests(this.status || undefined).toPromise();
        
      this.linkRequests = response?.results || [];
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      this.error = 'No se pudieron cargar las solicitudes';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Devuelve el color asociado a un estado de solicitud
   * @param status Estado de la solicitud
   * @returns Nombre del color para Ionic
   * 
   * Nota: Mantiene compatibilidad con 'accepted' (interfaz) y 'approved' (backend)
   */
  getStatusColor(status: string): string {
    switch(status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'accepted': return 'success';  // Para compatibilidad con versiones anteriores
      case 'rejected': return 'danger';
      default: return 'medium';
    }
  }
  
  /**
   * Devuelve el texto en español para mostrar al usuario
   * @param status Estado de la solicitud
   * @returns Texto traducido
   * 
   * Nota: Mantiene compatibilidad con 'accepted' (interfaz) y 'approved' (backend)
   */
  getStatusText(status: string): string {
    switch(status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobada';
      case 'accepted': return 'Aprobada';  // Para compatibilidad con versiones anteriores
      case 'rejected': return 'Rechazada';
      default: return 'Desconocido';
    }
  }

  async respondToRequest(request: LinkRequest, response: 'approved' | 'rejected') {
    const loading = await this.loadingCtrl.create({
      message: response === 'approved' ? 'Aprobando solicitud...' : 'Rechazando solicitud...'
    });
    await loading.present();
    
    try {
      await this.userLinkService.respondToLinkRequest(request.id, response).toPromise();
      
      // Actualizar la solicitud en la lista
      const index = this.linkRequests.findIndex(r => r.id === request.id);
      if (index !== -1) {
        this.linkRequests[index].status = response;
      }
      
      // Mostrar mensaje de éxito
      const alert = await this.alertCtrl.create({
        header: 'Éxito',
        message: response === 'approved' ? 
          'Solicitud aprobada. El operador ahora está vinculado contigo.' : 
          'Solicitud rechazada.',
        buttons: ['OK']
      });
      await alert.present();
      
      // Recargar la lista
      this.loadRequests();
    } catch (error) {
      console.error('Error al responder a la solicitud:', error);
      
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo procesar la respuesta a la solicitud',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      loading.dismiss();
    }
  }
}