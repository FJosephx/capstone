import { Component, OnInit } from '@angular/core';
import { Auth, UserProfile } from '../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false
})
export class AdminPage implements OnInit {
  userProfile: UserProfile | null = null;

  constructor(private auth: Auth, private router: Router) { }

  ngOnInit() {
    // Cargar información del usuario autenticado
    this.auth.currentUser.subscribe(user => {
      console.log('Admin page - User profile:', user);
      this.userProfile = user;
    });
  }

  async logout() {
    await this.auth.logout();
    
    // Navegamos a la página de login y forzamos recarga para asegurar estado limpio
    // Esto recargará completamente la aplicación
    window.location.href = '/login';
  }

}
