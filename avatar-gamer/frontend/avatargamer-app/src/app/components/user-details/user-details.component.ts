import { Component, Input } from '@angular/core';
import { IonicModule, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LinkedUser } from '../../services/user-link.service';
import { UserLinkService } from '../../services/user-link.service';
import { ExtendedUser } from '../../models/extended-user.model';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class UserDetailsComponent {
  @Input() user!: ExtendedUser;
  isEditing: boolean = false;
  editedUser: Partial<ExtendedUser> = {};

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private userLinkService: UserLinkService
  ) {}

  ngOnInit() {
    this.editedUser = { ...this.user };
  }

  dismissModal(reload: boolean = false) {
    this.modalCtrl.dismiss({
      reload: reload
    });
  }

  toggleEdit() {
    if (this.isEditing) {
      this.editedUser = { ...this.user };
    }
    this.isEditing = !this.isEditing;
  }

  async saveChanges() {
    const loading = await this.loadingCtrl.create({
      message: 'Guardando cambios...'
    });
    await loading.present();

    try {
      // Aquí iría la llamada al servicio para actualizar el usuario
      // await this.userLinkService.updateUser(this.user.id, this.editedUser);
      
      this.user = { ...this.user, ...this.editedUser };
      this.isEditing = false;
      
      const toast = await this.alertCtrl.create({
        header: 'Éxito',
        message: 'Usuario actualizado correctamente',
        buttons: ['OK']
      });
      await toast.present();
      
      this.dismissModal(true);
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo actualizar el usuario',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      loading.dismiss();
    }
  }

  async confirmDelete() {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro que deseas eliminar este usuario?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.deleteUser()
        }
      ]
    });

    await alert.present();
  }

  async deleteUser() {
    const loading = await this.loadingCtrl.create({
      message: 'Eliminando usuario...'
    });
    await loading.present();

    try {
      await this.userLinkService.unlinkUser(this.user.id).toPromise();
      
      const alert = await this.alertCtrl.create({
        header: 'Éxito',
        message: 'Usuario eliminado correctamente',
        buttons: ['OK']
      });
      await alert.present();
      
      this.dismissModal(true);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo eliminar el usuario',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      loading.dismiss();
    }
  }

  getRoleColor(role: string): string {
    switch(role?.toLowerCase()) {
      case 'admin': return 'danger';
      case 'operator': return 'warning';
      case 'user': return 'primary';
      default: return 'medium';
    }
  }

  getRoleIcon(role: string): string {
    switch(role?.toLowerCase()) {
      case 'admin': return 'star';
      case 'operator': return 'people';
      case 'user': return 'person';
      default: return 'help-circle';
    }
  }

  getRoleLabel(role: string): string {
    switch(role?.toLowerCase()) {
      case 'admin': return 'Administrador';
      case 'operator': return 'Operador';
      case 'user': return 'Usuario';
      default: return 'Sin rol';
    }
  }
}