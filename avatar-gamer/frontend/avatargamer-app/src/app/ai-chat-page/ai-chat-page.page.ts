import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AIService, AIResponse } from '../services/ai.service';
import { MicConsentComponent } from '../components/mic-consent/mic-consent.component';
import { ConsentService } from '../services/consent.service';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  error?: boolean;
}

@Component({
  selector: 'app-ai-chat-page',
  templateUrl: './ai-chat-page.page.html',
  styleUrls: ['./ai-chat-page.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class AIChatPagePage implements OnInit, OnDestroy {
  chatForm: FormGroup;
  messages: ChatMessage[] = [];
  isLoading = false;
  characterName = 'sinclair';
  responseLength = 'normal';
  language = 'es';

  speechSupported: boolean | null = null;
  isRecording = false;
  recognitionError = '';

  private recognition: any = null;
  private messageSnapshot = '';
  private pendingTranscript = '';
  private readonly microphoneConsentType = 'voice_capture';
  private readonly microphoneConsentVersion = 'v1';

  responseLengthOptions = [
    { value: 'very_brief', label: 'Muy breve' },
    { value: 'brief', label: 'Breve' },
    { value: 'normal', label: 'Normal' },
    { value: 'complete', label: 'Completa' },
    { value: 'very_complete', label: 'Muy completa' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private aiService: AIService,
    private modalCtrl: ModalController,
    private consentService: ConsentService,
    private alertCtrl: AlertController
  ) {
    this.chatForm = this.formBuilder.group({
      message: ['', [Validators.required]]
    });
  }

  async ngOnInit(): Promise<void> {
    this.messages.push({
      text: 'Hola! Soy tu asistente virtual. En que puedo ayudarte?',
      isUser: false,
      timestamp: new Date()
    });

    this.initSpeechRecognition();
    await this.ensureRemoteConsentState();
  }

  ngOnDestroy(): void {
    this.stopRecording();
    this.recognition?.abort?.();
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

  sendMessage(): void {
    if (this.chatForm.invalid || this.isLoading) {
      return;
    }

    const messageText = (this.chatForm.value.message || '').trim();
    if (!messageText) {
      return;
    }

    this.messages.push({
      text: messageText,
      isUser: true,
      timestamp: new Date()
    });

    this.chatForm.reset();
    this.isLoading = true;

    this.aiService.sendMessage({
      text: messageText,
      response_length: this.responseLength as any,
      character_name: this.characterName,
      language: this.language
    }).subscribe({
      next: (response: AIResponse) => {
        this.messages.push({
          text: response.reply,
          isUser: false,
          timestamp: new Date()
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.messages.push({
          text: `Error: ${error.message || 'No se pudo obtener una respuesta'}`,
          isUser: false,
          timestamp: new Date(),
          error: true
        });
        this.isLoading = false;
      }
    });
  }

  changeResponseLength(event: any): void {
    this.responseLength = event.detail.value;
  }

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') {
      this.speechSupported = false;
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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
      this.messageSnapshot = this.getMessageControlValue();
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      this.pendingTranscript = '';
      this.messageSnapshot = this.getMessageControlValue();
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
    } catch (error) {
      console.warn('No se pudo iniciar el reconocimiento de voz:', error);
    }
  }

  private stopRecording(): void {
    try {
      this.recognition?.stop();
    } catch (error) {
      console.warn('No se pudo detener el reconocimiento de voz:', error);
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

      this.setMessageControlValue(combined);
      this.messageSnapshot = combined;
      this.pendingTranscript = '';
    } else if (interimTranscript.trim()) {
      this.pendingTranscript = interimTranscript;
      const combined = [this.messageSnapshot, interimTranscript.trim()]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      this.setMessageControlValue(combined);
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

  private getMessageControlValue(): string {
    return (this.chatForm.get('message')?.value ?? '').toString();
  }

  private setMessageControlValue(value: string): void {
    this.chatForm.get('message')?.setValue(value);
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
          source: 'ai_chat_page',
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
