import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserConsentResponse {
  id: number;
  consent_type: string;
  version: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string;
  metadata: Record<string, unknown>;
}

export interface ConsentPayload {
  consent_type: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class ConsentService {
  private readonly baseUrl = `${environment.apiUrl}/consents`;

  constructor(private http: HttpClient) {}

  async recordConsent(consentType: string, version = '', metadata?: Record<string, unknown>): Promise<UserConsentResponse> {
    const payload: ConsentPayload = {
      consent_type: consentType,
      version,
      metadata
    };

    return await firstValueFrom(this.http.post<UserConsentResponse>(this.baseUrl, payload));
  }

  async hasConsent(consentType: string, version = ''): Promise<boolean> {
    let params = new HttpParams().set('consent_type', consentType);
    if (version) {
      params = params.set('version', version);
    }

    const consents = await firstValueFrom(
      this.http.get<UserConsentResponse[]>(this.baseUrl, { params })
    );

    return Array.isArray(consents) && consents.length > 0;
  }
}
