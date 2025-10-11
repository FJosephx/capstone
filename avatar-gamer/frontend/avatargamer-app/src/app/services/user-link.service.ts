import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { map, catchError, retry, mergeMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LinkedUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status?: 'online' | 'offline'; // Campo agregado para UI
}

export interface LinkResponse {
  ok: boolean;
  link_id: number;
}

export interface LinkRequestResponse {
  ok: boolean;
  request_id: number;
  status: string;
}

/**
 * Interfaz que define la estructura de una solicitud de vinculación entre operador y usuario
 * IMPORTANTE: El backend espera los estados como: 'pending', 'approved', 'rejected'
 * (NO usar 'accepted' en las peticiones, el backend devolverá error 400)
 */
export interface LinkRequest {
  id: number;
  operator: number;
  operator_username: string;
  user: number;
  user_username: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
  link_id?: number;
  is_active?: boolean; // Campo para verificar si la solicitud sigue activa
}

export interface LinkRequestsResponse {
  count: number;
  results: LinkRequest[];
}

export interface LinkedUsersResponse {
  count: number;
  results: LinkedUser[];
}

@Injectable({
  providedIn: 'root'
})
export class UserLinkService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Obtener usuarios vinculados al operador actual
  getLinkedUsers(): Observable<LinkedUsersResponse> {
    return this.http.get<LinkedUsersResponse>(`${this.API_URL}/users/linked`);
  }
  
  // Obtener operadores vinculados al usuario actual
  getLinkedOperators(): Observable<LinkedUsersResponse> {
    console.log(`[UserLinkService] Llamando a GET ${this.API_URL}/users/operators`);
    return this.http.get<LinkedUsersResponse>(`${this.API_URL}/users/operators`)
      .pipe(
        retry(1), // Reintenta la solicitud una vez si falla
        map(response => {
          console.log('[UserLinkService] Respuesta de operadores vinculados:', response);
          console.log('[UserLinkService] Resultados completos:', JSON.stringify(response, null, 2));
          if (response && response.results && response.results.length > 0) {
            console.log('[UserLinkService] Número de operadores vinculados:', response.results.length);
            response.results.forEach((op, idx) => {
              console.log(`[UserLinkService] Operador #${idx + 1}:`, op.id, op.username);
            });
          } else {
            console.log('[UserLinkService] No se encontraron operadores vinculados');
          }
          return response;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('[UserLinkService] Error al obtener operadores vinculados:', error);
          
          // Intenta obtener operadores desde solicitudes aprobadas si la API devuelve un error
          return this.getApprovedLinkRequestsOperators().pipe(
            map(operatorsFromRequests => {
              console.log('[UserLinkService] Operadores obtenidos de solicitudes:', operatorsFromRequests);
              return { count: operatorsFromRequests.length, results: operatorsFromRequests };
            }),
            catchError(reqError => {
              console.error('[UserLinkService] Error al obtener operadores desde solicitudes:', reqError);
              return of({ count: 0, results: [] });
            })
          );
        })
      );
  }
  
  // Método auxiliar para obtener operadores desde solicitudes aprobadas
  private getApprovedLinkRequestsOperators(): Observable<LinkedUser[]> {
    return this.http.get<LinkRequestsResponse>(`${this.API_URL}/link-requests/received?status=approved`)
      .pipe(
        mergeMap(response => {
          if (!response?.results?.length) {
            return of([]);
          }
          
          // Crear observables para cada solicitud de operador
          const operatorRequests = response.results.map(req => 
            this.http.get<LinkedUser>(`${this.API_URL}/users/operators/${req.operator}`).pipe(
              catchError(error => {
                console.log(`[UserLinkService] Error al obtener operador ${req.operator}, creando placeholder`);
                // Crear un placeholder si hay un error
                return of({
                  id: req.operator,
                  username: req.operator_username || `operador${req.operator}`,
                  email: `${req.operator_username || 'operador' + req.operator}@example.com`,
                  first_name: 'Operador',
                  last_name: `#${req.operator}`,
                  role: 'operator',
                  status: 'offline' as 'offline' // Cast explícito al tipo correcto
                });
              })
            )
          );
          
          // Combinar todos los resultados
          return forkJoin(operatorRequests);
        }),
        catchError(error => {
          console.error('[UserLinkService] Error al procesar solicitudes aprobadas:', error);
          return of([]);
        })
      );
  }

  // Vincular un usuario con el operador actual (método original - vinculación directa)
  linkUser(userId: number): Observable<LinkResponse> {
    return this.http.post<LinkResponse>(`${this.API_URL}/users/link`, { user_id: userId });
  }

  // Desvincular un usuario
  unlinkUser(userId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/users/unlink/${userId}`);
  }

  // Buscar usuarios para vincular (esto podría necesitar un endpoint adicional en el backend)
  searchUsers(query: string): Observable<LinkedUser[]> {
    return this.http.get<LinkedUser[]>(`${this.API_URL}/users/search?q=${query}`);
  }

  // --------- Métodos nuevos para el sistema de solicitudes de vinculación ---------

  // Crear una solicitud de vinculación (para operadores)
  createLinkRequest(userId: number, message?: string): Observable<LinkRequestResponse> {
    const data: any = { user_id: userId };
    if (message) {
      data.message = message;
    }
    return this.http.post<LinkRequestResponse>(`${this.API_URL}/link-requests`, data);
  }

  // Obtener solicitudes enviadas (para operadores)
  getSentLinkRequests(status?: string): Observable<LinkRequestsResponse> {
    let url = `${this.API_URL}/link-requests/sent`;
    if (status) {
      url += `?status=${status}`;
    }
    return this.http.get<LinkRequestsResponse>(url);
  }

  // Obtener solicitudes recibidas (para usuarios)
  getReceivedLinkRequests(status?: string): Observable<LinkRequestsResponse> {
    let url = `${this.API_URL}/link-requests/received`;
    if (status) {
      url += `?status=${status}`;
    }
    return this.http.get<LinkRequestsResponse>(url);
  }

  // Obtener detalles de una solicitud
  getLinkRequestDetails(requestId: number): Observable<LinkRequest> {
    return this.http.get<LinkRequest>(`${this.API_URL}/link-requests/${requestId}`);
  }

  /**
   * Verifica si existe un enlace entre un usuario y un operador
   * @param operatorId ID del operador
   * @param userId ID del usuario
   * @returns Observable que resuelve a true si existe un enlace, false si no
   */
  checkLinkExists(operatorId: number, userId: number): Observable<boolean> {
    return this.http.get<any>(`${this.API_URL}/users/check-link?operator_id=${operatorId}&user_id=${userId}`)
      .pipe(
        map(response => !!response.exists),
        catchError(error => {
          console.error('Error al verificar enlace existente:', error);
          return of(false); // Asumimos que no existe en caso de error
        })
      );
  }

  /**
   * Responder a una solicitud (para usuarios - aprobar o rechazar)
   * @param requestId ID de la solicitud de vinculación
   * @param status Estado a establecer ('approved' o 'rejected')
   * @returns Observable con la respuesta de la API
   * 
   * IMPORTANTE: El backend espera específicamente 'approved', no 'accepted'
   * Si se envía 'accepted', el backend responderá con error 400
   */
  respondToLinkRequest(requestId: number, status: 'approved' | 'rejected'): Observable<LinkRequest> {
    return this.http.patch<LinkRequest>(
      `${this.API_URL}/link-requests/${requestId}/respond`, 
      { status }
    );
  }

  // Obtener detalles de un operador por su ID
  getOperatorById(operatorId: number): Observable<LinkedUser> {
    return this.http.get<LinkedUser>(`${this.API_URL}/users/operators/${operatorId}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.log(`[UserLinkService] Error al obtener operador ${operatorId}, creando placeholder`);
          // En caso de error, crear un operador provisional
          return of({
            id: operatorId,
            username: `operador${operatorId}`,
            email: `operador${operatorId}@example.com`,
            first_name: 'Operador',
            last_name: `#${operatorId}`,
            role: 'operator',
            status: 'offline' as 'offline'
          });
        })
      );
  }
}