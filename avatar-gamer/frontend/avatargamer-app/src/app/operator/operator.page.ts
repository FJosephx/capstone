import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auth, UserProfile } from '../services/auth';
import { Router, RouterModule } from '@angular/router';
import { ModalController, AlertController, LoadingController, IonicModule, ToastController } from '@ionic/angular';
import { AddContactModalComponent } from '../components/add-contact-modal.component';
import { UserDetailsComponent } from '../components/user-details/user-details.component';
import { UserLinkService, LinkedUser, LinkRequest } from '../services/user-link.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { Subscription } from 'rxjs';
import { ChatService, PresenceUpdate } from '../services/chat.service';
import { HttpClient } from '@angular/common/http';

declare var JitsiMeetExternalAPI: any;

@Component({
  selector: 'app-operator',
  templateUrl: './operator.page.html',
  styleUrls: ['./operator.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, SharedModule]
})
export class OperatorPage implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  linkedUsers: LinkedUser[] = [];
  filteredUsers: LinkedUser[] = [];
  linkRequests: LinkRequest[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  activeTab: 'linked' | 'pending' = 'linked';
  selectedUserType: string = 'all';
  searchTerm: string = '';
  private presenceSubscription?: Subscription;

  // 🟢 NUEVO
  activeCallUser: LinkedUser | null = null;
  private jitsi: any;
  private apiUrl = 'https://www.triskeledu.cl/MisterRoboto/apirest/set_command/1';

  constructor(
    private auth: Auth, 
    private router: Router,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private userLinkService: UserLinkService,
    private chatService: ChatService,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.auth.currentUser.subscribe(user => {
      this.userProfile = user;
      this.loadLinkedUsers();
      this.loadPendingRequests();
    });

    this.listenPresenceUpdates();
  }

  ngOnDestroy(): void {
    this.presenceSubscription?.unsubscribe();
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
      this.linkedUsers = response?.results?.map(user => ({
        ...user,
        status: user.status ?? (user.is_online ? 'online' : 'offline')
      })) || [];
      
      // Inicializar usuarios filtrados
      this.filterUsers();
    } catch (error) {
      console.error('Error al cargar usuarios vinculados:', error);
      this.error = 'No se pudieron cargar los usuarios vinculados';
    } finally {
      this.isLoading = false;
    }
  }

  navigateToAIChat() {
    this.router.navigateByUrl('/ai-chat');
  }

  loadLinkRequests() {
    this.loadPendingRequests();
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
      this.activeTab = 'pending';
      this.loadPendingRequests();
    }
  }
  
  async unlinkUser(user: LinkedUser) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: `¿Estás seguro que deseas desvincular a ${user.username}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
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

  getRoleColor(role: string): string {
    switch(role?.toLowerCase()) {
      case 'admin': return 'danger';
      case 'operator': return 'warning';
      case 'user': return 'primary';
      default: return 'medium';
    }
  }

  filterUsers() {
    this.filteredUsers = this.linkedUsers.filter(user => {
      const matchesType = this.selectedUserType === 'all' || user.role?.toLowerCase() === this.selectedUserType;
      const searchLower = this.searchTerm.toLowerCase();
      const matchesSearch = !this.searchTerm || 
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower);
      
      return matchesType && matchesSearch;
    });
  }

  async showUserDetails(user: LinkedUser) {
    const modal = await this.modalCtrl.create({
      component: UserDetailsComponent,
      componentProps: {
        user: user
      },
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.75
    });

    modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.reload) {
      await this.loadLinkedUsers();
    }
  }

  async logout() {
    await this.auth.logout();
    window.location.href = '/login';
  }

  // 🟢 AHORA INICIA CHAT + VIDEOLLAMADA
  startChatWithUser(user: LinkedUser) {
    console.log('Iniciando chat y videollamada con usuario:', user);
    this.activeCallUser = user;
    setTimeout(() => this.launchJitsi(user.username), 300);
  }

  launchJitsi(username: string) {
    const domain = 'meet.jit.si';
    const options = {
      roomName: `AvatarGamer_${username}`,
      width: '100%',
      height: 500,
      parentNode: document.querySelector('#jitsi-container'),
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'tileview'],
      },
    };

    this.jitsi = new JitsiMeetExternalAPI(domain, options);
    console.log('🎥 Videollamada iniciada con', username);
  }

  enviarComando(cmd: string) {
    this.http.post(this.apiUrl, { command: cmd }).subscribe({
      next: () => console.log(`✅ Comando ${cmd} enviado a Triskeledu`),
      error: (err) => console.error('❌ Error enviando comando', err)
    });
  }

  endCall() {
    if (this.jitsi) {
      this.jitsi.dispose();
      this.jitsi = null;
    }
    this.activeCallUser = null;
  }

  private listenPresenceUpdates(): void {
    this.presenceSubscription?.unsubscribe();
    this.presenceSubscription = this.chatService.presenceUpdates$.subscribe(update => {
      void this.handlePresenceUpdate(update);
    });
  }

  private async handlePresenceUpdate(update: PresenceUpdate): Promise<void> {
    if (update.role !== 'user') return;

    const index = this.linkedUsers.findIndex(user => user.id === update.userId);
    if (index === -1) return;

    const previousStatus = this.linkedUsers[index].status === 'online' ? 'online' : 'offline';
    const newStatus: 'online' | 'offline' = update.isOnline ? 'online' : 'offline';

    if (previousStatus === newStatus && update.username === undefined) return;

    const updatedUser: LinkedUser = {
      ...this.linkedUsers[index],
      status: newStatus,
      is_online: update.isOnline,
      username: update.username ?? this.linkedUsers[index].username
    };

    this.linkedUsers = [
      ...this.linkedUsers.slice(0, index),
      updatedUser,
      ...this.linkedUsers.slice(index + 1)
    ];

    if (previousStatus !== 'online' && newStatus === 'online') {
      await this.presentPresenceToast(`${updatedUser.username || `Usuario ${updatedUser.id}`} se ha conectado`);
    }
  }

  private async presentPresenceToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}
