import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { Auth } from '../services/auth';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(private auth: Auth, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    // Verificar si hay un token de acceso
    return from(this.checkAuth(route, state));
  }
  
  private async checkAuth(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const token = await this.auth.getAccessToken();
    
    if (!token) {
      // Si no hay token, redirigir al login
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    // Si el token existe pero está expirado, intentar refrescarlo
    if (this.auth.isTokenExpired(token)) {
      const refreshed = await this.auth.refreshToken();
      if (!refreshed) {
        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    }
    
    // Verificar si la ruta requiere un rol específico
    const requiredRole = route.data['requiredRole'];
    
    if (requiredRole) {
      console.log('Auth Guard - Verificando rol requerido:', requiredRole);
      
      if (requiredRole === 'admin' && !this.auth.isAdmin()) {
        console.log('No es administrador, redirigiendo...');
        // Si no es admin pero es operator, redirigir a la vista de operador
        if (this.auth.isOperator()) {
          this.router.navigate(['/operator']);
        } else {
          this.router.navigate(['/tabs']);
        }
        return false;
      }
      
      if (requiredRole === 'operator' && !this.auth.isOperator()) {
        console.log('No es operador, redirigiendo...');
        // Si no es operator pero es admin, redirigir a la vista de admin
        if (this.auth.isAdmin()) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/tabs']);
        }
        return false;
      }
    }
    
    return true;
  }
}
