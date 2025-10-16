import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AIService, AIResponse } from '../services/ai.service';

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
export class AIChatPagePage implements OnInit {
  chatForm: FormGroup;
  messages: ChatMessage[] = [];
  isLoading = false;
  characterName = 'sinclair';
  responseLength = 'normal';
  language = 'es';
  
  // Opciones para la longitud de respuesta
  responseLengthOptions = [
    { value: 'very_brief', label: 'Muy breve' },
    { value: 'brief', label: 'Breve' },
    { value: 'normal', label: 'Normal' },
    { value: 'complete', label: 'Completa' },
    { value: 'very_complete', label: 'Muy completa' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private aiService: AIService
  ) {
    this.chatForm = this.formBuilder.group({
      message: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Añadir mensaje de bienvenida
    this.messages.push({
      text: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
      isUser: false,
      timestamp: new Date()
    });
  }

  sendMessage(): void {
    if (this.chatForm.invalid || this.isLoading) {
      return;
    }

    const messageText = this.chatForm.value.message.trim();
    if (!messageText) {
      return;
    }

    // Añadir mensaje del usuario al chat
    this.messages.push({
      text: messageText,
      isUser: true,
      timestamp: new Date()
    });

    // Limpiar el formulario
    this.chatForm.reset();

    // Mostrar indicador de carga
    this.isLoading = true;

    // Enviar mensaje a la IA
    this.aiService.sendMessage({
      text: messageText,
      response_length: this.responseLength as any,
      character_name: this.characterName,
      language: this.language
    }).subscribe({
      next: (response: AIResponse) => {
        // Añadir respuesta de la IA al chat
        this.messages.push({
          text: response.reply,
          isUser: false,
          timestamp: new Date()
        });
        this.isLoading = false;
      },
      error: (error) => {
        // Añadir mensaje de error al chat
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

  // Método para cambiar la longitud de respuesta
  changeResponseLength(event: any): void {
    this.responseLength = event.detail.value;
  }
}