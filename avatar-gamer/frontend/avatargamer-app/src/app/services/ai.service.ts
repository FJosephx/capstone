import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AIRequest {
  text: string;
  context?: string;
  response_length?: 'very_brief' | 'brief' | 'normal' | 'complete' | 'very_complete';
  character_name?: string;
  language?: string;
}

export interface AIResponse {
  reply: string;
  context?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private readonly API_URL = `${environment.apiUrl}/ai/chat`;

  constructor(private http: HttpClient) { }

  /**
   * Envía un mensaje al asistente de IA y recibe una respuesta
   * 
   * @param request Parámetros de la solicitud
   * @returns Observable con la respuesta de la IA
   */
  sendMessage(request: AIRequest): Observable<AIResponse> {
    return this.http.post<AIResponse>(this.API_URL, request)
      .pipe(
        catchError(error => {
          console.error('Error al comunicarse con el asistente IA:', error);
          
          // Si el error ya tiene un formato adecuado, usarlo
          if (error.error && error.error.error) {
            return throwError(() => new Error(error.error.error));
          }
          
          // De lo contrario, usar un mensaje genérico
          return throwError(() => new Error('Error al comunicarse con el asistente IA'));
        })
      );
  }
}