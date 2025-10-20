import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertController } from '@ionic/angular';
import { ChatContact, ChatService, PresenceUpdate } from '../services/chat.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
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

  constructor(
    private chatService: ChatService,
    private auth: Auth,
    private alertCtrl: AlertController
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
