import { Component, OnInit, OnDestroy } from '@angular/core';
import { Auth, UserProfile } from '../services/auth';
import { Router } from '@angular/router';
import { AlertController, LoadingController, IonicModule } from '@ionic/angular';
import { UserLinkService, LinkRequest } from '../services/user-link.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';

interface LinkedOperator {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: 'online' | 'offline';
}

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedModule]
})
export class UserPage implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  linkedOperators: LinkedOperator[] = [];
  pendingRequests: LinkRequest[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  activeTab: 'linked' | 'requests' = 'linked';
  private refreshInterval: any;

  constructor(
    private auth: Auth,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private userLinkService: UserLinkService
  ) { }

  ngOnInit() {
    // Cargar información del usuario autenticado
    this.auth.currentUser.subscribe(user => {
      this.userProfile = user;
      console.log('Usuario en panel usuario:', user);
      
      // Mostrar alerta si el rol no coincide con la vista
      if (user && user.role !== 'user') {
        console.warn('Usuario con rol', user.role, 'en vista de usuario');
      }
      
      this.loadLinkedOperators();
      this.loadPendingRequests();
    });
    
    // Configurar actualización periódica de operadores vinculados
    this.startPeriodicUpdates();
  }
  
  ngOnDestroy() {
    this.stopPeriodicUpdates();
  }
  
  startPeriodicUpdates() {
    // Actualizar cada 30 segundos
    this.refreshInterval = setInterval(() => {
      if (this.activeTab === 'linked') {
        console.log('Actualizando automáticamente operadores vinculados...');
        this.loadLinkedOperators();
      }
    }, 30000); // 30 segundos
  }
  
  stopPeriodicUpdates() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  segmentChanged(event: any) {
    this.activeTab = event.detail.value;
    
    if (this.activeTab === 'linked') {
      console.log('Cambiando a pestaña de operadores vinculados');
      this.loadLinkedOperators();
    } else if (this.activeTab === 'requests') {
      console.log('Cambiando a pestaña de solicitudes');
      this.loadPendingRequests();
    }
  }

  /**
   * Carga los operadores vinculados desde el backend
   * Este método se llama al cambiar a la pestaña "linked" y después de aprobar una solicitud
   */
  async loadLinkedOperators() {
    // Removemos esta validación para permitir la recarga forzada después de aprobar
    // if (this.activeTab !== 'linked') return;
    
    this.isLoading = true;
    this.error = null;
    
    try {
      console.log('[UserPage] Solicitando operadores vinculados...');
      const response = await this.userLinkService.getLinkedOperators().toPromise();
      console.log('[UserPage] Respuesta de operadores vinculados:', response);
      console.log('[UserPage] URL solicitada:', `${environment.apiUrl}/users/operators`);
      console.log('[UserPage] Usuario actual:', this.userProfile);
      
      if (response && response.results && response.results.length > 0) {
        // Asignar estado aleatorio (online/offline) a los operadores
        this.linkedOperators = response.results.map(operator => ({
          ...operator,
          status: Math.random() > 0.5 ? 'online' as const : 'offline' as const,
          role: 'operator'
        }));
        
        console.log('[UserPage] Operadores vinculados procesados:', this.linkedOperators);
        console.log('[UserPage] Número de operadores vinculados:', this.linkedOperators.length);
      } else {
        console.log('[UserPage] No se encontraron operadores vinculados en la respuesta principal');
        
        // Si no hay operadores en la respuesta principal, intentar buscar en solicitudes aprobadas
        try {
          console.log('[UserPage] Buscando en solicitudes aprobadas...');
          const approvedRequests = await this.userLinkService.getReceivedLinkRequests('approved').toPromise();
          console.log('[UserPage] Solicitudes aprobadas:', approvedRequests);
          
          if (approvedRequests && approvedRequests.results && approvedRequests.results.length > 0) {
            const operatorsFromRequests: LinkedOperator[] = [];
            
            for (const req of approvedRequests.results) {
              console.log(`[UserPage] Procesando solicitud aprobada ID: ${req.id} de operador ID: ${req.operator}`);
              // Para cada solicitud aprobada, obtener los datos del operador
              try {
                console.log(`[UserPage] Solicitando datos del operador ${req.operator}...`);
                const operatorData = await this.userLinkService.getOperatorById(req.operator).toPromise();
                console.log(`[UserPage] Datos del operador ${req.operator}:`, operatorData);
                
                if (operatorData) {
                  operatorsFromRequests.push({
                    ...operatorData,
                    status: Math.random() > 0.5 ? 'online' as const : 'offline' as const,
                    role: 'operator'
                  });
                  console.log(`[UserPage] Operador ${req.operator} agregado a la lista`);
                } else {
                  // Si no se puede obtener datos completos, usar los básicos de la solicitud
                  console.log(`[UserPage] No se obtuvieron datos completos del operador ${req.operator}, usando datos básicos`);
                  operatorsFromRequests.push({
                    id: req.operator,
                    username: req.operator_username || `operador${req.operator}`,
                    email: `${req.operator_username || 'operador' + req.operator}@example.com`,
                    first_name: 'Operador',
                    last_name: `#${req.operator}`,
                    role: 'operator',
                    status: 'offline' as const
                  });
                }
              } catch (error) {
                console.error(`[UserPage] Error al obtener datos del operador ${req.operator}:`, error);
                // Añadir datos básicos si no se pueden obtener los completos
                console.log(`[UserPage] Agregando datos básicos para operador ${req.operator} debido al error`);
                operatorsFromRequests.push({
                  id: req.operator,
                  username: req.operator_username || `operador${req.operator}`,
                  email: `${req.operator_username || 'operador' + req.operator}@example.com`,
                  first_name: 'Operador',
                  last_name: `#${req.operator}`,
                  role: 'operator',
                  status: 'offline' as 'offline'
                });
              }
            }
            
            this.linkedOperators = operatorsFromRequests;
            console.log('[UserPage] Operadores obtenidos de solicitudes aprobadas:', this.linkedOperators);
            console.log('[UserPage] Número de operadores encontrados en solicitudes:', this.linkedOperators.length);
          } else {
            console.log('[UserPage] No se encontraron solicitudes aprobadas');
            this.linkedOperators = [];
          }
        } catch (reqError) {
          console.error('[UserPage] Error al verificar solicitudes aprobadas:', reqError);
          this.linkedOperators = [];
        }
      }
    } catch (error: any) {
      console.error('Error al cargar operadores vinculados:', error);
      
      if (error.error && error.error.detail) {
        console.error('Detalle del error:', error.error.detail);
      }
      
      if (error.status) {
        console.error('Código de estado HTTP:', error.status);
      }
      
      this.error = 'No se pudieron cargar los operadores vinculados';
      this.linkedOperators = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Carga las solicitudes pendientes desde el backend
   * @returns Promise que se resuelve cuando se han cargado las solicitudes
   */
  async loadPendingRequests() {
    // Removemos esta validación para permitir la recarga forzada después de aprobar
    // if (this.activeTab !== 'requests') return;
    
    this.isLoading = true;
    this.error = null;
    
    try {
      console.log('[UserPage] Solicitando solicitudes pendientes de vinculación...');
      const response = await this.userLinkService.getReceivedLinkRequests('pending').toPromise();
      console.log('[UserPage] Respuesta de solicitudes pendientes:', response);
      
      this.pendingRequests = response?.results || [];
      console.log('[UserPage] Número de solicitudes pendientes:', this.pendingRequests.length);
      
      // Si hay solicitudes, mostrar IDs para depuración
      if (this.pendingRequests.length > 0) {
        console.log('[UserPage] IDs de solicitudes pendientes:',
          this.pendingRequests.map(req => `ID: ${req.id}, Operador: ${req.operator} (${req.operator_username})`));
      }
      
      return response;
    } catch (error) {
      console.error('[UserPage] Error al cargar solicitudes recibidas:', error);
      this.error = 'No se pudieron cargar las solicitudes';
      this.pendingRequests = [];
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Responde a una solicitud de vinculación (aprobar o rechazar)
   * @param request La solicitud de vinculación
   * @param status El nuevo estado ('approved' o 'rejected')
   */
  async respondToRequest(request: LinkRequest, status: 'approved' | 'rejected') {
    console.log(`[UserPage] Respondiendo a solicitud ID: ${request.id} con estado: ${status}`);
    console.log(`[UserPage] Detalles de la solicitud:`, request);
    
    const loading = await this.loadingCtrl.create({
      message: status === 'approved' ? 'Aprobando solicitud...' : 'Rechazando solicitud...'
    });
    await loading.present();
    
    try {
      // Verificar si la solicitud ya está en un estado final
      if (request.status !== 'pending') {
        console.error(`[UserPage] Error: La solicitud ya está en estado ${request.status}. No se puede cambiar a ${status}.`);
        throw new Error(`La solicitud ya está en estado ${request.status}. No se puede cambiar a ${status}.`);
      }
      
      // Verificar si la solicitud está inactiva
      if (request.is_active === false) {
        console.error(`[UserPage] Error: La solicitud ID ${request.id} está inactiva y no puede ser procesada.`);
        throw new Error('Esta solicitud ya no está activa. No se puede procesar.');
      }
      
      // Si se va a aprobar, verificar primero si ya existe un enlace
      if (status === 'approved') {
        try {
          const linkExists = await this.userLinkService.checkLinkExists(request.operator, request.user).toPromise();
          if (linkExists) {
            throw new Error('Ya existe un enlace entre este operador y usuario. No se puede volver a aprobar.');
          }
        } catch (checkError) {
          // Si falla la verificación, continuamos con el proceso normal
          console.warn('No se pudo verificar si existe un enlace previo:', checkError);
        }
      }
      // Guardar la información del operador antes de responder a la solicitud
      const operatorData: LinkedOperator = {
        id: request.operator,
        username: request.operator_username || `operador${request.operator}`,
        email: `${request.operator_username || 'operador' + request.operator}@example.com`,
        role: 'operator',
        status: 'online' as const,
        first_name: 'Operador',
        last_name: `#${request.operator}`
      };
      
      console.log('Información del operador extraída de la solicitud:', operatorData);
      
      // Responder a la solicitud
      const response = await this.userLinkService.respondToLinkRequest(request.id, status).toPromise();
      console.log('Respuesta de aceptación/rechazo:', response);
      
      // Actualizar la lista de solicitudes
      await this.loadPendingRequests();
      
      // Si se aprobó, también actualizar operadores vinculados
      if (status === 'approved') {
        console.log('[UserPage] Solicitud aprobada, agregando operador a la lista');
        
        // Aumentamos el tiempo de espera para asegurar que el backend ha procesado completamente el cambio
        console.log('[UserPage] Esperando a que el backend procese el cambio...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Cambiar a la pestaña de operadores vinculados y forzar una recarga
        this.activeTab = 'linked';
        
        // Registrar el operador de la solicitud en un array temporal para depuración
        const temporaryOperator: LinkedOperator = {
          id: request.operator,
          username: request.operator_username || `operador${request.operator}`,
          email: `${request.operator_username || 'operador' + request.operator}@example.com`,
          role: 'operator',
          status: 'online',
          first_name: 'Operador',
          last_name: `#${request.operator}`
        };
        
        console.log('[UserPage] Operador de la solicitud aprobada:', temporaryOperator);
        
        // Recargar explícitamente la lista de operadores vinculados desde el backend
        console.log('[UserPage] Recargando operadores vinculados desde el backend...');
        await this.loadLinkedOperators();
        
        // Si no se encontraron operadores en la recarga, agregar temporalmente el de la solicitud
        if (this.linkedOperators.length === 0) {
          console.log('[UserPage] No se encontraron operadores en la recarga, agregando temporalmente el operador de la solicitud');
          this.linkedOperators = [temporaryOperator];
        }
      }
      
      const alert = await this.alertCtrl.create({
        header: 'Éxito',
        message: status === 'approved' 
          ? 'Has aprobado la solicitud. El operador ahora está vinculado.' 
          : 'Has rechazado la solicitud.',
        buttons: ['OK']
      });
      
      await alert.present();
    } catch (error: any) {
      console.error('Error al responder a la solicitud:', error);
      
      // Mensaje de error personalizado según el tipo de error
      let errorMessage = 'No se pudo procesar la respuesta';
      
      if (error.status === 500) {
        // Error específico para solicitudes que probablemente ya tienen un enlace
        if (request.id === 4) {
          errorMessage = 'No se puede procesar la solicitud. Es posible que ya exista un enlace entre este operador y usuario. Prueba con otra solicitud o consulta al administrador.';
        } else {
          errorMessage = 'Error interno del servidor. Por favor, inténtalo más tarde o contacta con el administrador.';
        }
      } else if (error.error && error.error.detail) {
        errorMessage = error.error.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: errorMessage,
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      loading.dismiss();
    }
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'accepted': return 'success';  // Para compatibilidad con versiones anteriores
      case 'rejected': return 'danger';
      default: return 'medium';
    }
  }
  
  getStatusText(status: string): string {
    switch(status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobada';
      case 'accepted': return 'Aprobada';  // Para compatibilidad con versiones anteriores
      case 'rejected': return 'Rechazada';
      default: return 'Desconocido';
    }
  }

  async logout() {
    await this.auth.logout();
    
    // Navegamos a la página de login y forzamos recarga para asegurar estado limpio
    // Esto recargará completamente la aplicación
    window.location.href = '/login';
  }
  
  startChatWithOperator(operator: LinkedOperator) {
    console.log('Iniciando chat con operador:', operator);
    
    // Guardar información del operador seleccionado en localStorage para mantenerla entre páginas
    localStorage.setItem('selectedOperator', JSON.stringify({
      id: operator.id,
      username: operator.username,
      status: operator.status
    }));
    
    // Navegar a la página de chat
    this.router.navigate(['/chat']);
  }
}
