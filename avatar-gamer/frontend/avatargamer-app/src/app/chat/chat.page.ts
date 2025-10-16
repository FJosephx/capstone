import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService } from '../services/chat.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Auth } from '../services/auth';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatPage implements OnInit {
  messages$ = this.chatService.messages$;
  newMessage = '';
  userProfile: any = null;
  userRole: string = '';
  selectedContact: any = null;
  contactName: string = '';
  contactStatus: string = '';

  constructor(
    private chatService: ChatService,
    private router: Router,
    private auth: Auth,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    // Obtener información del usuario actual
    this.auth.getUserProfile().then(
      (userProfile: any) => {
        this.userProfile = userProfile;
        this.userRole = userProfile?.role || '';
        
        // Recuperar información del contacto seleccionado según el rol
        if (this.userRole === 'operator') {
          const selectedUserStr = localStorage.getItem('selectedUser');
          if (selectedUserStr) {
            this.selectedContact = JSON.parse(selectedUserStr);
            this.contactName = this.selectedContact.username || 'Usuario';
            this.contactStatus = this.selectedContact.status || 'offline';
            
            // Limpiar después de usar
            localStorage.removeItem('selectedUser');
          }
        } else {
          const selectedOperatorStr = localStorage.getItem('selectedOperator');
          if (selectedOperatorStr) {
            this.selectedContact = JSON.parse(selectedOperatorStr);
            this.contactName = this.selectedContact.username || 'Operador';
            this.contactStatus = this.selectedContact.status || 'offline';
            
            // Limpiar después de usar
            localStorage.removeItem('selectedOperator');
          }
        }
        
        // Configurar el mensaje inicial según el rol y contacto
        setTimeout(() => {
          if (this.userRole === 'operator') {
            const welcomeMsg = this.contactName 
              ? `¡Estás chateando con ${this.contactName}!` 
              : '¡Bienvenido operador! Estás listo para atender consultas.';
            this.chatService.sendMessage(welcomeMsg, 'operator');
          } else {
            const welcomeMsg = this.contactName 
              ? `¡Hola! Estás chateando con el operador ${this.contactName}. ¿En qué puedo ayudarte hoy?` 
              : '¡Hola! ¿En qué puedo ayudarte hoy?';
            this.chatService.sendMessage(welcomeMsg, 'operator');
          }
        }, 1000);
      }
    ).catch((error: any) => {
      console.error('Error obteniendo perfil:', error);
    });
  }

  sendMessage() {
    if (this.newMessage.trim()) {
      // Determinar el tipo de remitente basado en el rol
      const sender = this.userRole === 'operator' ? 'operator' : 'user';
      this.chatService.sendMessage(this.newMessage.trim(), sender);
      
      // Simular respuesta solo si el usuario actual no es operador
      if (this.userRole !== 'operator') {
        if (this.newMessage.toLowerCase().includes('hola')) {
          this.chatService.simulateOperatorResponse('¡Hola! ¿Necesitas ayuda?');
        } else {
          this.chatService.simulateOperatorResponse('Gracias por tu mensaje. ¿En qué puedo ayudarte?');
        }
      }
      
      this.newMessage = '';
    }
  }

}