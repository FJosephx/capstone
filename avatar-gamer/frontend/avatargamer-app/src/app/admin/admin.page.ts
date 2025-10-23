import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { Auth, UserProfile } from '../services/auth';
import { AdminUserService, AdminUser, AdminUserPayload } from '../services/admin-user.service';

interface AdminUserFilters {
  search: string;
  role: string;
  id: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false
})
export class AdminPage implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  users: AdminUser[] = [];
  totalUsers = 0;
  loadingUsers = false;
  submittingUser = false;

  filters: AdminUserFilters = { search: '', role: '', id: '' };
  readonly roles = [
    { value: '', label: 'Todos los roles' },
    { value: 'admin', label: 'Administrador' },
    { value: 'operator', label: 'Operador' },
    { value: 'user', label: 'Usuario final' }
  ];

  isUserModalOpen = false;
  isEditMode = false;
  selectedUser: AdminUser | null = null;

  userForm: FormGroup;

  private userSub?: Subscription;

  constructor(
    private auth: Auth,
    private adminUserService: AdminUserService,
    private fb: FormBuilder,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      first_name: [''],
      last_name: [''],
      role: ['user', Validators.required],
      password: [''],
      is_active: [true]
    });
  }

  ngOnInit() {
    this.userSub = this.auth.currentUser.subscribe(user => {
      this.userProfile = user;
    });

    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  async logout() {
    await this.auth.logout();
    window.location.href = '/login';
  }

  trackByUserId(_index: number, user: AdminUser) {
    return user.id;
  }

  onFiltersChange() {
    this.loadUsers();
  }

  hasActiveFilters(): boolean {
    return !!this.filters.search || !!this.filters.role || !!this.filters.id;
  }

  clearFilters() {
    this.filters = { search: '', role: '', id: '' };
    this.loadUsers();
  }

  loadUsers() {
    this.loadingUsers = true;
    this.adminUserService.listUsers(this.filters).subscribe({
      next: response => {
        this.users = response.results;
        this.totalUsers = response.count;
        this.loadingUsers = false;
      },
      error: err => {
        console.error('No se pudieron cargar los usuarios', err);
        this.loadingUsers = false;
        this.presentToast('No se pudieron cargar los usuarios.', 'danger');
      }
    });
  }

  openCreateModal() {
    this.isEditMode = false;
    this.selectedUser = null;
    this.userForm.reset({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: 'user',
      password: '',
      is_active: true
    });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.isUserModalOpen = true;
  }

  openEditModal(user: AdminUser) {
    this.isEditMode = true;
    this.selectedUser = user;
    this.userForm.reset({
      username: user.username,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      password: '',
      is_active: user.is_active ?? true
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.setValidators([Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.isUserModalOpen = true;
  }

  closeUserModal() {
    this.isUserModalOpen = false;
    this.userForm.reset();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.submittingUser = false;
    this.selectedUser = null;
  }

  submitUserForm() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const payload = this.userForm.getRawValue() as AdminUserPayload;

    if (!payload.password) {
      delete payload.password;
    }

    this.submittingUser = true;

    const request$ = this.isEditMode && this.selectedUser
      ? this.adminUserService.updateUser(this.selectedUser.id, payload)
      : this.adminUserService.createUser(payload);

    request$.subscribe({
      next: () => {
        this.submittingUser = false;
        this.isUserModalOpen = false;
        this.presentToast(this.isEditMode ? 'Usuario actualizado.' : 'Usuario creado.');
        this.loadUsers();
      },
      error: err => {
        console.error('Error al guardar usuario', err);
        this.submittingUser = false;
        const defaultMessage = this.isEditMode
          ? 'No se pudo actualizar el usuario.'
          : 'No se pudo crear el usuario.';
        const message = err?.error?.detail || err?.error?.password || err?.error?.username || defaultMessage;
        this.presentToast(message, 'danger');
      }
    });
  }

  async confirmDelete(user: AdminUser) {
    if (this.userProfile && user.id === this.userProfile.id) {
      this.presentToast('No puedes eliminar tu propia cuenta.', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Eliminar usuario',
      message: `¿Seguro que deseas eliminar a <strong>${user.username}</strong>?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.deleteUser(user)
        }
      ]
    });

    await alert.present();
  }

  private deleteUser(user: AdminUser) {
    this.adminUserService.deleteUser(user.id).subscribe({
      next: () => {
        this.presentToast('Usuario eliminado.');
        this.loadUsers();
      },
      error: err => {
        console.error('No se pudo eliminar el usuario', err);
        this.presentToast('No se pudo eliminar el usuario.', 'danger');
      }
    });
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });

    await toast.present();
  }
}
