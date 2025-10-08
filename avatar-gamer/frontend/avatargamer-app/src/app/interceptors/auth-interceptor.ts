import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Auth } from '../services/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private auth: Auth, private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // No interceptamos las peticiones a auth/token o auth/token/refresh
    if (request.url.includes('auth/token')) {
      return next.handle(request);
    }

    // Convertir la promesa en un observable
    return from(this.addToken(request)).pipe(
      switchMap(requestWithToken => {
        return next.handle(requestWithToken).pipe(
          catchError((error: HttpErrorResponse) => {
            // Si el error es 401 (no autorizado) o 403 (prohibido)
            if (error.status === 401 || error.status === 403) {
              // Intentar refrescar el token
              return from(this.handleAuthError(request, next));
            }
            
            return throwError(() => error);
          })
        );
      })
    );
  }

  private async addToken(request: HttpRequest<any>): Promise<HttpRequest<any>> {
    const token = await this.auth.getAccessToken();
    
    if (token) {
      return request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return request;
  }

  private async handleAuthError(request: HttpRequest<any>, next: HttpHandler): Promise<HttpEvent<any>> {
    try {
      // Intentar refrescar el token
      const refreshSuccess = await this.auth.refreshToken();
      
      if (refreshSuccess) {
        // Volver a intentar la petición original con el nuevo token
        const token = await this.auth.getAccessToken();
        const requestWithNewToken = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Usamos lastValueFrom para convertir el observable a promesa
        return next.handle(requestWithNewToken).toPromise() as Promise<HttpEvent<any>>;
      } else {
        // Si no se pudo refrescar, redirigir al login
        this.auth.logout();
        this.router.navigate(['/login']);
        throw new Error('No se pudo refrescar el token');
      }
    } catch (error) {
      // Si hay cualquier error durante el refresh, cerrar sesión
      this.auth.logout();
      this.router.navigate(['/login']);
      throw error;
    }
  }
}
