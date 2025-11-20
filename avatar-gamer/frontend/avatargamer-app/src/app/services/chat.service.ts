import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../environments/environment';
import { Auth, UserProfile } from './auth';

export type ChatParticipantRole = 'operator' | 'user';

export interface ChatParticipant {
  id: number;
  role: ChatParticipantRole;
}

export interface ChatContact extends ChatParticipant {
  username: string;
  status?: string;
}

export interface ChatMessage {
  id?: string;
  clientMessageId?: string;
  conversationId: string;
  text: string;
  senderRole: ChatParticipantRole;
  senderId: number;
  recipientId?: number;
  timestamp: Date;
  read?: boolean;
}

export interface PresenceUpdate {
  userId: number;
  role: ChatParticipantRole;
  isOnline: boolean;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export type SocketConnectionState = 'disconnected' | 'connecting' | 'connected';

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private socket?: Socket;
  private authSubscription: Subscription;
  private currentUser: UserProfile | null = null;
  private currentUserRole: ChatParticipantRole = 'user';
  private activeContact: ChatContact | null = null;
  private conversationId: string | null = null;

  private readonly messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  readonly messages$ = this.messagesSubject.asObservable();

  private readonly connectionStateSubject = new BehaviorSubject<SocketConnectionState>('disconnected');
  readonly connectionState$ = this.connectionStateSubject.asObservable();

  private readonly presenceSubject = new Subject<PresenceUpdate>();
  readonly presenceUpdates$ = this.presenceSubject.asObservable();

  private readonly unreadMessagesSubject = new BehaviorSubject<{ [key: string]: number }>({});
  readonly unreadMessages$ = this.unreadMessagesSubject.asObservable();

  constructor(private readonly auth: Auth) {
    this.authSubscription = this.auth.currentUser.subscribe((user) => {
      this.currentUser = user;
      this.currentUserRole = this.normalizeRole(user?.role);

      if (user) {
        void this.ensureSocketConnection();
      } else {
        this.teardownSocket();
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.teardownSocket();
  }

  async setActiveContact(contact: ChatContact | null): Promise<void> {
    if (!contact) {
      this.clearConversation();
      return;
    }

    this.leaveConversation();

    this.activeContact = contact;
    this.conversationId = null;
    this.messagesSubject.next([]);

    await this.ensureSocketConnection();

    if (this.socket?.connected) {
      this.joinConversation();
    }
  }

  clearConversation(): void {
    this.leaveConversation();
    this.activeContact = null;
    this.conversationId = null;
    this.messagesSubject.next([]);
  }

  sendMessage(rawText: string): void {
    const text = rawText.trim();

    if (!text || !this.activeContact || !this.currentUser) {
      return;
    }

    const conversationId = this.conversationId ?? this.buildConversationId(
      { id: this.currentUser.id, role: this.currentUserRole },
      this.activeContact
    );

    this.conversationId = conversationId;

    const outgoingMessage: ChatMessage = {
      id: undefined,
      clientMessageId: this.generateClientMessageId(),
      conversationId,
      text,
      senderRole: this.currentUserRole,
      senderId: this.currentUser.id,
      recipientId: this.activeContact.id,
      timestamp: new Date()
    };

    this.appendMessage(outgoingMessage);

    if (this.socket) {
      this.socket.emit('chat:message', {
        conversationId: outgoingMessage.conversationId,
        text: outgoingMessage.text,
        senderId: outgoingMessage.senderId,
        senderRole: this.currentUser.role,
        recipientId: outgoingMessage.recipientId,
        timestamp: outgoingMessage.timestamp.toISOString(),
        clientMessageId: outgoingMessage.clientMessageId
      });
    }
  }

  private async ensureSocketConnection(): Promise<void> {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    if (!this.currentUser) {
      return;
    }

    const token = await this.auth.getAccessToken();

    if (!token) {
      return;
    }

    this.connectionStateSubject.next('connecting');

    this.socket = io(environment.socketUrl, {
      transports: ['polling'],     // 👈 solo HTTP polling
      upgrade: false,              // 👈 no intentes hacer upgrade a websocket
      auth: { token },
      query: {
        userId: String(this.currentUser.id),
        role: this.currentUser.role
      }
    });


    this.socket.on('connect', () => {
      // TEMPORARY DEBUG
      alert('Socket CONNECTED! ID: ' + this.socket?.id);
      this.connectionStateSubject.next('connected');

      if (this.activeContact) {
        this.joinConversation();
      }
    });

    this.socket.on('disconnect', (reason) => {
      // TEMPORARY DEBUG
      alert('Socket DISCONNECTED: ' + reason);
      this.connectionStateSubject.next('disconnected');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error', error);
      // TEMPORARY DEBUG: Alert the error to see it on mobile
      alert('Socket Error: ' + error.message);
      this.connectionStateSubject.next('disconnected');
    });

    this.socket.on('chat:history', (history: unknown) => {
      if (!Array.isArray(history)) {
        return;
      }

      const normalizedHistory = history
        .map((item) => this.normalizeIncomingMessage(item))
        .filter((message): message is ChatMessage => !!message)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      this.messagesSubject.next(normalizedHistory);
    });

    this.socket.on('chat:message', (payload: unknown) => {
      const message = this.normalizeIncomingMessage(payload);

      if (!message) {
        return;
      }

      if (this.conversationId && message.conversationId !== this.conversationId) {
        return;
      }

      this.appendMessage(message);
    });

    this.socket.on('presence:update', (payload: unknown) => {
      this.handlePresenceUpdate(payload);
    });
  }

  private joinConversation(): void {
    if (!this.socket || !this.currentUser || !this.activeContact) {
      return;
    }

    this.conversationId = this.buildConversationId(
      { id: this.currentUser.id, role: this.currentUserRole },
      this.activeContact
    );

    this.socket.emit('chat:join', {
      conversationId: this.conversationId,
      participants: [
        { id: this.currentUser.id, role: this.currentUser.role },
        { id: this.activeContact.id, role: this.activeContact.role }
      ]
    });
  }

  private leaveConversation(): void {
    if (this.socket && this.conversationId) {
      this.socket.emit('chat:leave', {
        conversationId: this.conversationId
      });
    }
  }

  private teardownSocket(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = undefined;
    }

    this.connectionStateSubject.next('disconnected');
    this.activeContact = null;
    this.conversationId = null;
    this.messagesSubject.next([]);
  }

  private handlePresenceUpdate(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const raw = payload as Record<string, unknown>;
    const userId = this.normalizeNumericField(raw['userId'] ?? raw['user_id']);

    if (userId === null || (this.currentUser && userId === this.currentUser.id)) {
      return;
    }

    const role = this.normalizeRole(raw['role']);

    const onlineRaw = raw['isOnline'] ?? raw['is_online'];
    let isOnline = false;

    if (typeof onlineRaw === 'boolean') {
      isOnline = onlineRaw;
    } else if (typeof onlineRaw === 'string') {
      const normalized = onlineRaw.trim().toLowerCase();
      isOnline = normalized === 'true' || normalized === '1';
    } else if (typeof onlineRaw === 'number') {
      isOnline = onlineRaw === 1;
    } else if (onlineRaw != null) {
      isOnline = Boolean(onlineRaw);
    }

    const username = typeof raw['username'] === 'string' ? raw['username'] : undefined;
    const firstName = typeof raw['firstName'] === 'string'
      ? raw['firstName']
      : typeof raw['first_name'] === 'string'
        ? raw['first_name'] as string
        : undefined;
    const lastName = typeof raw['lastName'] === 'string'
      ? raw['lastName']
      : typeof raw['last_name'] === 'string'
        ? raw['last_name'] as string
        : undefined;

    const update: PresenceUpdate = {
      userId,
      role,
      isOnline,
      username,
      firstName,
      lastName
    };

    if (this.activeContact && this.activeContact.id === userId && this.activeContact.role === role) {
      const status = isOnline ? 'online' : 'offline';
      this.activeContact = {
        ...this.activeContact,
        status,
        username: update.username ?? this.activeContact.username
      };
    }

    this.presenceSubject.next(update);
  }

  private appendMessage(message: ChatMessage): void {
    const currentMessages = this.messagesSubject.getValue();
    const isDuplicated = currentMessages.some((existing) => {
      if (message.id && existing.id && message.id === existing.id) {
        return true;
      }

      if (message.clientMessageId && existing.clientMessageId && message.clientMessageId === existing.clientMessageId) {
        return true;
      }

      return false;
    });

    if (!isDuplicated) {
      // Marcar el mensaje como no leído si es de otro usuario
      if (this.currentUser && message.senderId !== this.currentUser.id) {
        message.read = false;
        this.incrementUnreadCount(message.senderId);
      } else {
        message.read = true;
      }

      this.messagesSubject.next([...currentMessages, message]);
    }
  }

  private incrementUnreadCount(senderId: number): void {
    const currentCounts = this.unreadMessagesSubject.getValue();
    const senderKey = `${senderId}`;
    const currentCount = currentCounts[senderKey] || 0;
    this.unreadMessagesSubject.next({
      ...currentCounts,
      [senderKey]: currentCount + 1
    });
  }

  markMessagesAsRead(contactId: number): void {
    // Marcar mensajes como leídos
    const currentMessages = this.messagesSubject.getValue();
    const updatedMessages = currentMessages.map(msg => {
      if (msg.senderId === contactId && !msg.read) {
        return { ...msg, read: true };
      }
      return msg;
    });
    this.messagesSubject.next(updatedMessages);

    // Resetear el contador de mensajes no leídos
    const currentCounts = this.unreadMessagesSubject.getValue();
    const { [contactId.toString()]: _, ...restCounts } = currentCounts;
    this.unreadMessagesSubject.next(restCounts);
  }

  getUnreadCount(contactId: number): number {
    const counts = this.unreadMessagesSubject.getValue();
    return counts[contactId.toString()] || 0;
  }

  private normalizeIncomingMessage(payload: unknown): ChatMessage | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const raw = payload as Record<string, unknown>;

    const text = typeof raw['text'] === 'string'
      ? raw['text'] as string
      : typeof raw['message'] === 'string'
        ? raw['message'] as string
        : null;

    if (!text) {
      return null;
    }

    const senderId = this.normalizeNumericField(raw['senderId'] ?? raw['sender_id'] ?? (raw['sender'] as Record<string, unknown>)?.['id']);

    if (senderId === null) {
      return null;
    }

    const senderRole = this.normalizeRole(
      raw['senderRole'] ?? raw['sender_role'] ?? (raw['sender'] as Record<string, unknown>)?.['role']
    );

    const recipientId = this.normalizeNumericField(
      raw['recipientId'] ?? raw['recipient_id'] ?? raw['receiverId'] ?? raw['receiver_id'] ?? (raw['recipient'] as Record<string, unknown>)?.['id']
    ) ?? undefined;

    const timestampValue = raw['timestamp'] ?? raw['createdAt'] ?? raw['created_at'];
    const timestamp = timestampValue ? new Date(timestampValue as string) : new Date();

    const conversationId = typeof raw['conversationId'] === 'string'
      ? raw['conversationId'] as string
      : this.conversationId ?? this.deriveConversationId(senderId, senderRole, recipientId);

    const id = typeof raw['id'] === 'string'
      ? raw['id'] as string
      : typeof raw['messageId'] === 'string'
        ? raw['messageId'] as string
        : undefined;

    const clientMessageId = typeof raw['clientMessageId'] === 'string'
      ? raw['clientMessageId'] as string
      : undefined;

    return {
      id,
      clientMessageId,
      conversationId,
      text,
      senderRole,
      senderId,
      recipientId,
      timestamp
    };
  }

  private deriveConversationId(senderId: number, senderRole: ChatParticipantRole, recipientId?: number): string {
    const sender: ChatParticipant = { id: senderId, role: senderRole };

    if (recipientId && this.currentUser && recipientId === this.currentUser.id) {
      return this.buildConversationId(sender, { id: this.currentUser.id, role: this.currentUserRole });
    }

    if (this.activeContact && senderId === this.activeContact.id) {
      return this.buildConversationId(sender, this.activeContact);
    }

    if (this.conversationId) {
      return this.conversationId;
    }

    if (recipientId && this.activeContact) {
      return this.buildConversationId(sender, this.activeContact);
    }

    if (this.currentUser) {
      return this.buildConversationId(sender, { id: this.currentUser.id, role: this.currentUserRole });
    }

    return `conversation:${sender.role}-${sender.id}`;
  }

  private buildConversationId(a: ChatParticipant, b: ChatParticipant): string {
    const participants = [this.participantKey(a), this.participantKey(b)].sort();
    return `conversation:${participants[0]}:${participants[1]}`;
  }

  private participantKey(participant: ChatParticipant): string {
    return `${participant.role}-${participant.id}`;
  }

  private normalizeRole(role: unknown): ChatParticipantRole {
    return role === 'operator' ? 'operator' : 'user';
  }

  private normalizeNumericField(value: unknown): number | null {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private generateClientMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
