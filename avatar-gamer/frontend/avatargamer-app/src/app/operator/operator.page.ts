import { Component, OnInit } from '@angular/core';
import { Auth, UserProfile } from '../services/auth';
import { Router } from '@angular/router';
import { ModalController, AlertController, LoadingController, IonicModule } from '@ionic/angular';
import { AddContactModalComponent } from '../components/add-contact-modal.component';
import { UserLinkService, LinkedUser, LinkRequest } from '../services/user-link.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'app-operator',
  templateUrl: './operator.page.html',
  styleUrls: ['./operator.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedModule]
})
export class OperatorPage implements OnInit {
  userProfile: UserProfile | null = null;
  linkedUsers: LinkedUser[] = [];
  linkRequests: LinkRequest[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  activeTab: 'linked' | 'pending' = 'linked';

  constructor(
    private auth: Auth, 
    private router: Router,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private userLinkService: UserLinkService
  ) { }

  ngOnInit() {
    // Cargar información del usuario autenticado
    this.auth.currentUser.subscribe(user => {
      this.userProfile = user;
      this.loadLinkedUsers();
      this.loadPendingRequests();
    });
  }

  segmentChanged(event: any) {
    this.activeTab = event.detail.value;
    
    if (this.activeTab === 'linked') {
      this.loadLinkedUsers();
    } else if (this.activeTab === 'pending') {
      this.loadPendingRequests();
    }
  }

  async loadLinkedUsers() {
    if (this.activeTab !== 'linked') return;
    
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await this.userLinkService.getLinkedUsers().toPromise();
      
      // Asignar estado aleatorio (online/offline) a los usuarios
      // En una implementación real, esto vendría del backend
      this.linkedUsers = response?.results.map(user => ({
        ...user,
        status: Math.random() > 0.5 ? 'online' : 'offline'
      })) || [];
      
      console.log('Usuarios vinculados:', this.linkedUsers);
    } catch (error) {
      console.error('Error al cargar usuarios vinculados:', error);
      this.error = 'No se pudieron cargar los usuarios vinculados';
    } finally {
      this.isLoading = false;
    }
  }

  async loadPendingRequests() {
    if (this.activeTab !== 'pending') return;
    
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await this.userLinkService.getSentLinkRequests().toPromise();
      this.linkRequests = response?.results || [];
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      this.error = 'No se pudieron cargar las solicitudes';
    } finally {
      this.isLoading = false;
    }
  }

  async openAddContactModal() {
    const modal = await this.modalCtrl.create({
      component: AddContactModalComponent
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data && data.success) {
      // Si la solicitud se ha creado correctamente, cambiar a la pestaña de pendientes
      this.activeTab = 'pending';
      this.loadPendingRequests();
    }
  }
  
  async unlinkUser(user: LinkedUser) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: `¿Estás seguro que deseas desvincular a ${user.username}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Desvincular',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Desvinculando usuario...'
            });
            await loading.present();
            
            try {
              await this.userLinkService.unlinkUser(user.id).toPromise();
              this.linkedUsers = this.linkedUsers.filter(u => u.id !== user.id);
              
              const successAlert = await this.alertCtrl.create({
                header: 'Éxito',
                message: 'Usuario desvinculado correctamente',
                buttons: ['OK']
              });
              await successAlert.present();
            } catch (error) {
              console.error('Error al desvincular usuario:', error);
              
              const errorAlert = await this.alertCtrl.create({
                header: 'Error',
                message: 'No se pudo desvincular al usuario',
                buttons: ['OK']
              });
              await errorAlert.present();
            } finally {
              loading.dismiss();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'medium';
    }
  }
  
  getStatusText(status: string): string {
    switch(status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Rechazada';
      default: return 'Desconocido';
    }
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
