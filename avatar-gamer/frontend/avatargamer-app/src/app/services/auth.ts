import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  access: string;
  refresh: string;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'auth_tokens';
  private readonly USER_KEY = 'user_profile';
  
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser = this.currentUserSubject.asObservable();

  private _isLoggedIn = new BehaviorSubject<boolean>(false);
  public isLoggedIn = this._isLoggedIn.asObservable();

  private _storage: Storage | null = null;

  constructor(
    private http: HttpClient,
    private storage: Storage,
    private router: Router
  ) {
    this.initStorage();
  }

  async initStorage() {
    const storage = await this.storage.create();
    this._storage = storage;
    this.loadStoredToken();
  }

  async loadStoredToken() {
    if (!this._storage) return;
    
    try {
      const tokens = await this._storage.get(this.TOKEN_KEY);
      const user = await this._storage.get(this.USER_KEY);
      
      if (tokens && user) {
        this.currentUserSubject.next(user);
        this._isLoggedIn.next(true);
      }
    } catch (error) {
      console.error('Error loading stored token:', error);
    }
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/token`, { username, password })
      .pipe(
        tap(async (response) => {
          if (response.access && response.refresh) {
            await this.saveTokens(response);
            await this.getUserProfile(); // Obtiene información del usuario después del login
            console.log("Información de usuario después de login:", this.currentUserSubject.value);
          }
        })
      );
  }

  async getUserProfile() {
    try {
      const user = await this.http.get<UserProfile>(`${this.API_URL}/me`).toPromise();
      if (user) {
        console.log("Perfil de usuario obtenido:", user);
        this.currentUserSubject.next(user);
        this._isLoggedIn.next(true);
        await this._storage?.set(this.USER_KEY, user);
        
        // Guardar también en localStorage para acceso rápido
        localStorage.setItem('user_profile', JSON.stringify(user));
      }
      return user;
    } catch (error) {
      console.error('Error getting user profile:', error);
      this.logout();
      return null;
    }
  }

  async refreshToken() {
    if (!this._storage) return of(false);
    
    try {
      const tokens = await this._storage.get(this.TOKEN_KEY);
      
      if (tokens?.refresh) {
        const response = await this.http.post<{ access: string }>(`${this.API_URL}/auth/token/refresh`, { 
          refresh: tokens.refresh 
        }).toPromise();
        
        if (response?.access) {
          tokens.access = response.access;
          await this._storage.set(this.TOKEN_KEY, tokens);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      return false;
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (!this._storage) return null;
    
    try {
      const tokens = await this._storage.get(this.TOKEN_KEY);
      return tokens?.access || null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async saveTokens(tokens: AuthResponse) {
    if (!this._storage) return;
    
    const tokensToSave = {
      access: tokens.access,
      refresh: tokens.refresh
    };
    
    await this._storage.set(this.TOKEN_KEY, tokensToSave);
    this._isLoggedIn.next(true);
  }

  async logout() {
    if (!this._storage) return;
    
    // Limpiar token y datos de usuario del almacenamiento
    await this._storage.remove(this.TOKEN_KEY);
    await this._storage.remove(this.USER_KEY);
    
    // Reiniciar todos los estados
    this.currentUserSubject.next(null);
    this._isLoggedIn.next(false);
    
    // Limpiar cualquier otro dato en memoria que pueda estar guardado
    localStorage.clear(); // Limpiar localStorage por si acaso
    sessionStorage.clear(); // Limpiar sessionStorage por si acaso
    
    // No navegamos aquí - lo haremos desde los componentes
  }

  getCurrentUserRole(): string | null {
    const user = this.currentUserSubject.value;
    return user ? user.role : null;
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    console.log('Checking isAdmin():', user);
    
    // Considera que el usuario es administrador si su username es "admin"
    // O si su rol es explícitamente "admin"
    return user?.username === 'admin' || user?.role === 'admin';
  }

  isOperator(): boolean {
    const user = this.currentUserSubject.value;
    console.log('Checking isOperator():', user);
    
    // Usuario es operador si su rol es "operator"
    return user?.role === 'operator';
  }

  // Helper para verificar si el token ha expirado
  isTokenExpired(token: string): boolean {
    if (!token) return true;
    
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000; // Convertir a milisegundos
      return Date.now() > expirationTime;
    } catch (error) {
      return true;
    }
  }
}
