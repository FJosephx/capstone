import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
// 👇 LÍNEA MODIFICADA: Se añadió ModalController y AlertButton
import { AlertController, ModalController, AlertButton } from '@ionic/angular';
import { ChatContact, ChatService, PresenceUpdate } from '../services/chat.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Auth } from '../services/auth';

// 👇 AÑADIDO: Importar el componente de Jitsi
import { JitsiCallComponent } from '../components/jitsi-call/jitsi-call.component';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  // 👇 LÍNEA MODIFICADA: Se añadió JitsiCallComponent
  imports: [CommonModule, FormsModule, IonicModule, JitsiCallComponent]
})
export class ChatPage implements OnInit, OnDestroy {
  messages$ = this.chatService.messages$;
  connectionState$ = this.chatService.connectionState$;
  newMessage = '';
  userProfile: any = null;
  userRole: string = '';
  selectedContact: ChatContact | null = null;
  contactName: string = '';
  contactStatus: string = '';
  private presenceSubscription?: Subscription;

  // 🟢 AÑADIDAS: Propiedades para controlar la vista de la llamada
  isCallActive = false;
  currentRoomName = '';
  currentDisplayName = '';

  constructor(
    private chatService: ChatService,
    private auth: Auth,
    private alertCtrl: AlertController,
    // (Dejamos ModalController por si se usa para otros modales)
    private modalCtrl: ModalController 
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const userProfile = await this.auth.getUserProfile();
      this.userProfile = userProfile;
      this.userRole = userProfile?.role || '';

      await this.restoreSelectedContact();
      this.listenPresenceUpdates();
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
    }
  }

  ngOnDestroy(): void {
    this.presenceSubscription?.unsubscribe();
    this.chatService.clearConversation();
  }

  sendMessage() {
    if (!this.newMessage.trim()) {
      return;
    }

    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

  async showQuickResponses() {
    // Define las respuestas según el rol
    const responses = this.userRole === 'operator'
      ? ['Hola, ¿en qué puedo ayudarte?', 'Un momento, por favor.', 'Voy a iniciar la videollamada.']
      : ['Necesito ayuda, por favor.', 'Sí', 'No', 'Gracias.'];

    // Crea los botones para el Alert
    const alertButtons: AlertButton[] = responses.map(response => ({
      text: response,
      handler: () => {
        this.newMessage = response; // Pone el texto en la caja de mensaje
        this.sendMessage();         // Envía el mensaje inmediatamente
      }
    }));

    // Añade el botón de cancelar
    alertButtons.push({
      text: 'Cancelar',
      role: 'cancel',
    });

    const alert = await this.alertCtrl.create({
      header: 'Respuestas Rápidas',
      buttons: alertButtons
    });

    await alert.present();
  }

  // 🟡 ==========================================
  // 🟡 == MÉTODO DE VIDEOLLAMADA MODIFICADO ==
  // 🟡 ==========================================
  async startVideoCall() {
    if (!this.selectedContact || !this.userProfile) {
      console.error('Perfil de usuario o contacto no seleccionado');
      return;
    }

    // 1. Generar un nombre de sala único pero consistente
    const userId = this.userProfile.id;
    const contactId = this.selectedContact.id;
    
    const sortedIds = [userId, contactId].sort();
    
    // 2. Asignar los valores a las propiedades de la clase
    this.currentRoomName = `avatar-gamer-call-${sortedIds[0]}-${sortedIds[1]}`;
    this.currentDisplayName = this.userProfile.username || `Usuario ${this.userProfile.id}`;

    // 3. 🟢 Simplemente activa la vista de la llamada
    this.isCallActive = true;
  }
  // 👆 ==========================================
  // 👆 == FIN DEL MÉTODO MODIFICADO ==
  // 👆 ==========================================


  // 🟢 ==========================================
  // 🟢 == AÑADIDO: Método para manejar el fin de la llamada ==
  // 🟢 ==========================================
  public onCallEnded() {
    this.isCallActive = false;
    // Limpiamos los datos de la sala
    this.currentRoomName = '';
    this.currentDisplayName = '';
  }
  // 👆 ==========================================
  // 👆 == FIN DEL MÉTODO AÑADIDO ==
  // 👆 ==========================================


  private listenPresenceUpdates(): void {
    this.presenceSubscription?.unsubscribe();
    this.presenceSubscription = this.chatService.presenceUpdates$.subscribe((update) => {
      void this.applyPresenceUpdate(update);
    });
  }

  private async applyPresenceUpdate(update: PresenceUpdate): Promise<void> {
    if (!this.selectedContact) {
      return;
    }

    const isForActiveContact =
      update.userId === this.selectedContact.id && update.role === this.selectedContact.role;

    if (!isForActiveContact) {
      return;
    }

    const previousStatus = this.selectedContact.status === 'online' ? 'online' : 'offline';
    const newStatus = update.isOnline ? 'online' : 'offline';

    this.selectedContact = {
      ...this.selectedContact,
      status: newStatus,
      username: update.username ?? this.selectedContact.username
    };

    this.contactStatus = newStatus;
    this.contactName = this.getDisplayName(this.selectedContact);

    if (update.role === 'operator' && newStatus === 'online' && previousStatus !== 'online') {
      await this.presentPresenceAlert(update);
    }
  }

  private async presentPresenceAlert(update: PresenceUpdate): Promise<void> {
    if (!this.selectedContact) {
      return;
    }

    const displayName = this.getDisplayName({
      ...this.selectedContact,
      username: update.username ?? this.selectedContact.username
    });

    const alert = await this.alertCtrl.create({
      header: 'Conexion detectada',
      message: `${displayName} se ha conectado`,
      buttons: ['OK']
    });

    await alert.present();
  }

  private async restoreSelectedContact(): Promise<void> {
    let storedContact: any = null;

    if (this.userRole === 'operator') {
      const selectedUserStr = localStorage.getItem('selectedUser');
      if (selectedUserStr) {
        storedContact = JSON.parse(selectedUserStr);
        localStorage.removeItem('selectedUser');
      }
    } else {
      const selectedOperatorStr = localStorage.getItem('selectedOperator');
      if (selectedOperatorStr) {
        storedContact = JSON.parse(selectedOperatorStr);
        localStorage.removeItem('selectedOperator');
      }
    }

    if (storedContact?.id) {
      const status = storedContact.status === 'online' ? 'online' : 'offline';
      this.selectedContact = {
        id: storedContact.id,
        username: storedContact.username || '',
        status,
        role: this.userRole === 'operator' ? 'user' : 'operator'
      };

      this.contactName = this.getDisplayName(this.selectedContact);
      this.contactStatus = status;

      await this.chatService.setActiveContact(this.selectedContact);
    } else {
      this.selectedContact = null;
      this.contactName = '';
      this.contactStatus = '';

      await this.chatService.setActiveContact(null);
    }
  }

  private getDisplayName(contact: ChatContact | null | undefined): string {
    if (!contact) {
      return '';
    }

    if (contact.username && contact.username.trim().length > 0) {
      return contact.username;
    }

    const label = contact.role === 'operator' ? 'Operador' : 'Usuario';
    return `${label} ${contact.id}`;
  }

}