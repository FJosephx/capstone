import { Component, OnDestroy, OnInit } from '@angular/core';
import { ChatContact, ChatService } from '../services/chat.service';
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

  constructor(
    private chatService: ChatService,
    private auth: Auth
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const userProfile = await this.auth.getUserProfile();
      this.userProfile = userProfile;
      this.userRole = userProfile?.role || '';

      await this.restoreSelectedContact();
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
    }
  }

  ngOnDestroy(): void {
    this.chatService.clearConversation();
  }

  sendMessage() {
    if (!this.newMessage.trim()) {
      return;
    }

    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
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
      this.selectedContact = {
        id: storedContact.id,
        username: storedContact.username || 'Contacto',
        status: storedContact.status || 'offline',
        role: this.userRole === 'operator' ? 'user' : 'operator'
      };

      this.contactName = this.selectedContact.username;
      this.contactStatus = this.selectedContact.status ?? 'offline';

      await this.chatService.setActiveContact(this.selectedContact);
    } else {
      this.selectedContact = null;
      this.contactName = '';
      this.contactStatus = '';

      await this.chatService.setActiveContact(null);
    }
  }

}