import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active?: boolean;
  date_joined?: string;
  last_login?: string | null;
}

export interface AdminUserPayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  password?: string;
  is_active?: boolean;
}

export interface AdminUserListResponse {
  count: number;
  results: AdminUser[];
}

export interface AdminUserFilters {
  search?: string;
  role?: string;
  id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {
  private readonly baseUrl = `${environment.apiUrl}/admin/users`;

  constructor(private http: HttpClient) {}

  listUsers(filters: AdminUserFilters): Observable<AdminUserListResponse> {
    let params = new HttpParams();

    if (filters.search) {
      params = params.set('search', filters.search);
    }

    if (filters.role) {
      params = params.set('role', filters.role);
    }

    if (filters.id) {
      params = params.set('id', filters.id);
    }

    return this.http.get<AdminUserListResponse>(this.baseUrl, { params });
  }

  createUser(payload: AdminUserPayload): Observable<AdminUser> {
    return this.http.post<AdminUser>(this.baseUrl, payload);
  }

  updateUser(userId: number, payload: AdminUserPayload): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/${userId}`, payload);
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${userId}`);
  }
}
