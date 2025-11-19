import { Component, OnInit, OnDestroy, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonicModule } from '@ionic/angular';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

type ResponseLength = 'very_brief' | 'brief' | 'normal' | 'complete' | 'very_complete';

interface ChatSource {
  label?: string;
  url: string;
}
interface ChatMessage {
  id: string;
  isUser: boolean;
  text: string;
  timestamp: Date | string | number;
  error?: boolean;
  format?: 'text' | 'code';
  sources?: ChatSource[];
}

type TimelineItem =
  | { type: 'date'; label: string; dateKey: string }
  | { type: 'group'; isUser: boolean; messages: Array<ChatMessage & { groupStart?: boolean; groupEnd?: boolean }> };

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

@Component({
  selector: 'app-ai-chat-page',
  standalone: true,
  imports: [
    // Angular / Ionic
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    // Pipes standalone
    DatePipe,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './ai-chat-page.page.html',
  styleUrls: ['./ai-chat-page.page.scss'],
})
export class AiChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content?: IonContent;

  chatForm!: FormGroup;

  messages: ChatMessage[] = [];
  timeline: TimelineItem[] = [];

  isLoading = false;

  language: 'es' | 'en' = 'es';
  responseLength: ResponseLength = 'normal';
  responseLengthOptions = [
    { value: 'very_brief', label: 'Muy breve' },
    { value: 'brief', label: 'Breve' },
    { value: 'normal', label: 'Normal' },
    { value: 'complete', label: 'Completa' },
    { value: 'very_complete', label: 'Muy completa' },
  ];

  speechSupported: boolean | null = null;
  isRecording = false;
  recognitionError: string | null = null;
  private recognition: any = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.chatForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(1)]],
    });
    this.detectSpeechSupport();
  }

  ngOnDestroy(): void {
    this.stopRecognition();
  }

  // -------- Mensajería --------
  async sendMessage(): Promise<void> {
    if (this.chatForm.invalid || this.isLoading) return;

    const text: string = (this.chatForm.value.message || '').toString().trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      isUser: true,
      text,
      timestamp: new Date(),
      format: this.maybeIsCode(text) ? 'code' : 'text',
    };
    this.messages.push(userMsg);
    this.chatForm.reset({ message: '' });
    this.rebuildTimeline();
    this.scrollToBottom();

    this.isLoading = true;
    try {
      const ai = await this.sendToAI(userMsg);
      this.messages.push(ai);
      this.rebuildTimeline();
      this.scrollToBottom();
    } catch (e) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        isUser: false,
        text: 'Ocurrió un error procesando tu solicitud.',
        timestamp: new Date(),
        error: true,
      };
      this.messages.push(errMsg);
      this.rebuildTimeline();
    } finally {
      this.isLoading = false;
    }
  }

  private maybeIsCode(text: string): boolean {
    const looksLikeCodeFence = text.trim().startsWith('```') || /;\s*$/.test(text);
    const hasBracesOrTags = /[{<>}]/.test(text) && /\n/.test(text);
    return looksLikeCodeFence || hasBracesOrTags;
  }

  // Simulación/placeholder (reemplaza por tu servicio real)
  private async sendToAI(userMsg: ChatMessage): Promise<ChatMessage> {
    await new Promise((r) => setTimeout(r, 600));
    const demo: ChatMessage = {
      id: crypto.randomUUID(),
      isUser: false,
      text:
        this.responseLength === 'very_brief'
          ? 'Hecho.'
          : this.responseLength === 'brief'
          ? 'Aquí tienes un resumen breve de tu consulta.'
          : this.responseLength === 'normal'
          ? 'Te comparto una respuesta detallada y directa acorde a tu consulta.'
          : this.responseLength === 'complete'
          ? 'A continuación, una respuesta completa con consideraciones adicionales.'
          : 'Respuesta muy completa, con pasos, ejemplos y observaciones finales.',
      timestamp: new Date(),
      sources: [
        { label: 'Fuente 1', url: 'https://example.com/fuente-1' },
        { label: 'Fuente 2', url: 'https://example.com/fuente-2' },
      ],
    };

    if (this.maybeIsCode(userMsg.text)) {
      demo.format = 'code';
      demo.text = `// Ejemplo de respuesta de código
function greet(name) {
  return \`Hola, \${name}!\`;
}

console.log(greet('AvatarGamer'));`;
    }

    return demo;
  }

  // -------- Timeline (chips + agrupación) --------
  private rebuildTimeline(): void {
    const msgs = [...this.messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const out: TimelineItem[] = [];
    let currentDateKey = '';
    let currentGroup: TimelineItem | null = null;

    const sameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const dt = new Date(m.timestamp);
      const dateKey = dt.toISOString().slice(0, 10);

      if (dateKey !== currentDateKey) {
        currentDateKey = dateKey;
        const hoy = new Date();
        let label = dt.toLocaleDateString();
        if (sameDay(dt, hoy)) {
          label = 'Hoy';
        } else {
          const ayer = new Date(hoy);
          ayer.setDate(hoy.getDate() - 1);
          if (sameDay(dt, ayer)) label = 'Ayer';
        }
        out.push({ type: 'date', label, dateKey });
        currentGroup = null;
      }

      if (!currentGroup || currentGroup.type !== 'group' || currentGroup.isUser !== m.isUser) {
        if (currentGroup && currentGroup.type === 'group' && currentGroup.messages.length) {
          currentGroup.messages[currentGroup.messages.length - 1].groupEnd = true;
        }
        currentGroup = { type: 'group', isUser: m.isUser, messages: [] };
        out.push(currentGroup);
      }

      const msgExt: ChatMessage & { groupStart?: boolean; groupEnd?: boolean } = { ...m };
      if (currentGroup.messages.length === 0) msgExt.groupStart = true;
      currentGroup.messages.push(msgExt);
    }

    if (currentGroup && currentGroup.type === 'group' && currentGroup.messages.length) {
      currentGroup.messages[currentGroup.messages.length - 1].groupEnd = true;
    }

    this.timeline = out;
  }

  // -------- Utilidades UI --------
  copyCode(text: string): void {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  }

  openSource(url: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private async scrollToBottom(): Promise<void> {
    try {
      await this.content?.scrollToBottom(200);
    } catch {}
  }

  // -------- Voz a texto --------
  private detectSpeechSupport(): void {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.speechSupported = !!SR;
    if (this.speechSupported) {
      this.initRecognition(SR);
    }
  }

  private initRecognition(SR: any): void {
    this.recognition = new SR();
    this.recognition.lang = this.language === 'es' ? 'es-ES' : 'en-US';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      const current = (this.chatForm.value.message || '').toString();
      const joined = current ? `${current} ${transcript}` : transcript;
      this.chatForm.patchValue({ message: joined.trim() });
    };

    this.recognition.onerror = (event: any) => {
      this.recognitionError = event?.error ? `Error de voz: ${event.error}` : 'Error de captura de voz';
      this.isRecording = false;
    };

    this.recognition.onend = () => {
      this.isRecording = false;
    };
  }

  toggleRecording(): void {
    if (!this.speechSupported) return;

    if (this.isRecording) {
      this.stopRecognition();
    } else {
      this.startRecognition();
    }
  }

  private startRecognition(): void {
    try {
      this.recognitionError = null;
      if (this.recognition) {
        this.recognition.lang = this.language === 'es' ? 'es-ES' : 'en-US';
        this.recognition.start();
        this.isRecording = true;
      }
    } catch (e) {
      this.recognitionError = 'No se pudo iniciar el micrófono.';
      this.isRecording = false;
    }
  }

  private stopRecognition(): void {
    try {
      if (this.recognition) this.recognition.stop();
    } catch {}
    this.isRecording = false;
  }
}
