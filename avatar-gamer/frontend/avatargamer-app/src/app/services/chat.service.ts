import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'operator' | 'user';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor() {}

  sendMessage(text: string, sender: 'operator' | 'user'): void {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    
    const currentMessages = this.messagesSubject.getValue();
    this.messagesSubject.next([...currentMessages, newMessage]);
  }

  simulateOperatorResponse(message: string): void {
    setTimeout(() => {
      this.sendMessage(message, 'operator');
    }, 1000);
  }
}