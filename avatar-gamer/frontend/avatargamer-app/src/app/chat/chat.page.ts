import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertController, ModalController } from '@ionic/angular';
import { ChatContact, ChatService, PresenceUpdate } from '../services/chat.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Auth } from '../services/auth';
import { MicConsentComponent } from '../components/mic-consent/mic-consent.component';
import { ConsentService } from '../services/consent.service';

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
  }
}

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
  speechSupported: boolean | null = null;
  isRecording = false;
  recognitionError = '';
  userRole: string = '';
  selectedContact: ChatContact | null = null;
  contactName: string = '';
  contactStatus: string = '';
  private presenceSubscription?: Subscription;
  private recognition: any = null;
  private messageSnapshot = '';
  private pendingTranscript = '';
  recordingDuration = '0:00';
  private recordingStartTime: number = 0;
  private recordingTimer: any = null;
  private readonly microphoneConsentType = 'voice_capture';
  private readonly microphoneConsentVersion = 'v1';

  constructor(
    private chatService: ChatService,
    private auth: Auth,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private consentService: ConsentService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const userProfile = await this.auth.getUserProfile();
      this.userProfile = userProfile;
      this.userRole = userProfile?.role || '';

      await this.restoreSelectedContact();
      this.listenPresenceUpdates();
      this.initSpeechRecognition();
      await this.ensureRemoteConsentState();
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
    }
  }

  ngOnDestroy(): void {
    this.presenceSubscription?.unsubscribe();
    this.chatService.clearConversation();
    this.stopRecording();
    this.recognition?.abort?.();
  }

  sendMessage() {
    if (!this.newMessage.trim()) {
      return;
    }

    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

  async toggleRecording(): Promise<void> {
    if (this.speechSupported !== true || !this.recognition) {
      this.recognitionError = 'La captura de voz no es compatible con este navegador.';
      return;
    }

    if (this.isRecording) {
      this.stopRecording();
      return;
    }

    const hasConsent = localStorage.getItem('microphoneConsent') === 'true';
    
    if (!hasConsent) {
      const modal = await this.modalCtrl.create({
        component: MicConsentComponent,
        cssClass: 'mic-consent-modal'
      });

      await modal.present();
      const { data: consentGranted } = await modal.onDidDismiss();

      if (!consentGranted) {
        return;
      }

      const registered = await this.registerMicrophoneConsent();
      if (!registered) {
        return;
      }

      localStorage.setItem('microphoneConsent', 'true');
    }

    this.startRecording();
  }

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') {
      this.speechSupported = false;
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.speechSupported = false;
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = true;
    this.recognition.continuous = false;

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.recognitionError = '';
      this.pendingTranscript = '';
      this.messageSnapshot = this.newMessage;
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      this.pendingTranscript = '';
      this.messageSnapshot = this.newMessage;
    };

    this.recognition.onerror = (event: any) => {
      this.isRecording = false;
      this.pendingTranscript = '';
      this.recognitionError = this.translateRecognitionError(event?.error);
    };

    this.recognition.onresult = (event: any) => {
      this.handleRecognitionResult(event);
    };

    this.speechSupported = true;
  }

  private startRecording(): void {
    try {
      this.recognition?.start();
      this.recordingStartTime = Date.now();
      this.updateRecordingDuration();
      this.playStartSound();
    } catch (error) {
      console.warn('No se pudo iniciar el reconocimiento de voz:', error);
    }
  }

  private stopRecording(): void {
    try {
      this.recognition?.stop();
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      this.recordingDuration = '0:00';
      this.playStopSound();
    } catch (error) {
      console.warn('No se pudo detener el reconocimiento de voz:', error);
    }
  }

  private updateRecordingDuration(): void {
    this.recordingTimer = setInterval(() => {
      const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      this.recordingDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  private async playStartSound() {
    const audio = new Audio('assets/sounds/mic-start.mp3');
    try {
      await audio.play();
    } catch (error) {
      console.warn('No se pudo reproducir el sonido de inicio:', error);
    }
  }

  private async playStopSound() {
    const audio = new Audio('assets/sounds/mic-stop.mp3');
    try {
      await audio.play();
    } catch (error) {
      console.warn('No se pudo reproducir el sonido de fin:', error);
    }
  }

  private handleRecognitionResult(event: any): void {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptChunk = event.results[i][0]?.transcript ?? '';
      if (event.results[i].isFinal) {
        finalTranscript += transcriptChunk;
      } else {
        interimTranscript += transcriptChunk;
      }
    }

    if (finalTranscript.trim()) {
      const combined = [this.messageSnapshot, finalTranscript.trim()]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      this.newMessage = combined;
      this.messageSnapshot = combined;
      this.pendingTranscript = '';
    } else if (interimTranscript.trim()) {
      this.pendingTranscript = interimTranscript;
      const combined = [this.messageSnapshot, interimTranscript.trim()]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      this.newMessage = combined;
    }
  }

  private translateRecognitionError(code: string | undefined): string {
    switch (code) {
      case 'not-allowed':
        return 'El navegador bloqueo el acceso al microfono. Verifica los permisos.';
      case 'audio-capture':
        return 'No se detecto un microfono disponible.';
      case 'no-speech':
        return 'No se detecto voz. Intenta nuevamente.';
      case 'network':
        return 'Hubo un problema de red durante la transcripcion.';
      default:
        return 'Ocurrio un error al transcribir el audio.';
    }
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

  private async ensureRemoteConsentState(): Promise<void> {
    try {
      const hasRemoteConsent = await this.consentService.hasConsent(
        this.microphoneConsentType,
        this.microphoneConsentVersion
      );

      if (hasRemoteConsent) {
        localStorage.setItem('microphoneConsent', 'true');
      }
    } catch (error) {
      console.warn('No se pudo verificar el consentimiento remoto:', error);
    }
  }

  private async registerMicrophoneConsent(): Promise<boolean> {
    try {
      await this.consentService.recordConsent(
        this.microphoneConsentType,
        this.microphoneConsentVersion,
        {
          source: 'chat_page',
          recordedAt: new Date().toISOString()
        }
      );

      return true;
    } catch (error) {
      console.error('Error registrando consentimiento:', error);
      await this.presentConsentErrorAlert();
      return false;
    }
  }

  private async presentConsentErrorAlert(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'No se pudo guardar el consentimiento',
      message: 'Hubo un problema al guardar el consentimiento del microfono. Intenta nuevamente mas tarde.',
      buttons: ['OK']
    });

    await alert.present();
  }
}
