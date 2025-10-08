import { Component, OnInit } from '@angular/core';
import { Auth, UserProfile } from '../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-operator',
  templateUrl: './operator.page.html',
  styleUrls: ['./operator.page.scss'],
  standalone: false
})
export class OperatorPage implements OnInit {
  userProfile: UserProfile | null = null;
  linkedUsers: any[] = []; // Esto se llenará con datos reales del backend

  constructor(private auth: Auth, private router: Router) { }

  ngOnInit() {
    // Cargar información del usuario autenticado
    this.auth.currentUser.subscribe(user => {
      this.userProfile = user;
    });
    
    // Simulación de usuarios vinculados (esto será reemplazado con datos reales)
    this.linkedUsers = [
      { id: 1, username: 'gamer1', status: 'online' },
      { id: 2, username: 'gamer2', status: 'offline' },
      { id: 3, username: 'gamer3', status: 'online' }
    ];
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }

}
