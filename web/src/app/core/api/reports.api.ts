import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { DashboardStats, OccupancyRow } from './models';

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  dashboard() {
    return this.http.get<ApiSuccess<DashboardStats>>(`${this.base}/dashboard`).pipe(map((r) => r.data));
  }

  occupancy() {
    return this.http.get<ApiSuccess<OccupancyRow[]>>(`${this.base}/occupancy`).pipe(map((r) => r.data));
  }

  attendanceTrend(days = 14) {
    return this.http
      .get<ApiSuccess<{ date: string; present: number; absent: number }[]>>(`${this.base}/attendance-trend`, {
        params: { days: String(days) },
      })
      .pipe(map((r) => r.data));
  }

  genderBreakdown() {
    return this.http
      .get<ApiSuccess<{ male: number; female: number }>>(`${this.base}/gender-breakdown`)
      .pipe(map((r) => r.data));
  }
}
