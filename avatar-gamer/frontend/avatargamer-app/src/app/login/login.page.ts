import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private auth: Auth
  ) { 
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit() {
  }

  async login() {
    if (this.loginForm.invalid) {
      // Marca todos los campos como tocados para mostrar los errores
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...',
      spinner: 'circles',
    });
    await loading.present();
    this.isSubmitting = true;

    try {
      const { username, password } = this.loginForm.value;
      
      // Realizar el login usando nuestro servicio de autenticación
      this.auth.login(username, password).subscribe({
        next: async (response) => {
          console.log('Login exitoso:', response);
          loading.dismiss();
          this.isSubmitting = false;
          
          // Obtener información del usuario
          const userProfile = await this.auth.getUserProfile();
          
          // Redirigir según el rol del usuario
          if (this.auth.isAdmin()) {
            this.router.navigate(['/admin']);
          } else if (this.auth.isOperator()) {
            this.router.navigate(['/operator']);
          } else {
            this.router.navigate(['/tabs']);
          }
        },
        error: (error) => {
          loading.dismiss();
          this.isSubmitting = false;
          
          console.log('Error detallado:', error);
          
          // Manejar diferentes tipos de errores
          if (error.status === 401) {
            this.showError('Usuario o contraseña incorrectos.');
          } else if (error.status === 429) {
            this.showError('Demasiados intentos fallidos. Cuenta bloqueada temporalmente.');
          } else if (error.error && error.error.detail) {
            // Capturar mensajes específicos del backend sobre bloqueo
            if (error.error.detail.includes('Cuenta bloqueada')) {
              this.showError(error.error.detail);
            } else {
              this.showError(error.error.detail || 'Error de autenticación');
            }
          } else {
            this.showError('Error de conexión. Intenta nuevamente.');
          }
          
          console.error('Error de login:', error);
        }
      });
      
    } catch (error) {
      loading.dismiss();
      this.isSubmitting = false;
      this.showError('No se pudo iniciar sesión. Verifica tus credenciales.');
      console.error('Error de login:', error);
    }
  }

  async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
