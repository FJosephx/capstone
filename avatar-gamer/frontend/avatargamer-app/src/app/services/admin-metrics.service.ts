import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface UserActivityMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  newUsersLast7Days: number;
  sessionsLast7Days: number;
}

export interface UserInteractionMetrics {
  linkRequestsLast30Days: number;
  approvedLinkRequestsLast30Days: number;
  pendingLinkRequests: number;
  activeLinks: number;
  newLinksLast30Days: number;
  messagesLast7Days: number;
  conversationsLast7Days: number;
}

export interface ResourcePerformanceMetrics {
  authSuccessRate: number;
  authFailureRate: number;
  authAttemptsLast7Days: number;
  avgAuthAttemptsPerUser: number;
  lockedAccounts: number;
}

export interface AdminMetricsResponse {
  userActivity: UserActivityMetrics;
  userInteraction: UserInteractionMetrics;
  resourcePerformance: ResourcePerformanceMetrics;
}

@Injectable({
  providedIn: 'root',
})
export class AdminMetricsService {
  private readonly baseUrl = `${environment.apiUrl}/admin/metrics`;

  constructor(private http: HttpClient) {}

  getMetrics(): Observable<AdminMetricsResponse> {
    return this.http.get<AdminMetricsResponse>(this.baseUrl);
  }
}
