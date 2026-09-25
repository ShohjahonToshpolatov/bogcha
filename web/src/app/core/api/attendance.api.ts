import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { AttendanceRecord, AttendanceStatus, DailyAttendanceEntry } from './models';

@Injectable({ providedIn: 'root' })
export class AttendanceApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/attendance`;

  daily(groupId: string, date: string) {
    return this.http
      .get<ApiSuccess<DailyAttendanceEntry[]>>(this.base, { params: { groupId, date } })
      .pipe(map((r) => r.data));
  }

  checkIn(childId: string, temperature?: string, note?: string) {
    return this.http
      .post<ApiSuccess<AttendanceRecord>>(`${this.base}/check-in`, { childId, temperature, note })
      .pipe(map((r) => r.data));
  }

  checkOut(childId: string, pickupPersonId?: string, note?: string) {
    return this.http
      .post<ApiSuccess<AttendanceRecord>>(`${this.base}/check-out`, { childId, pickupPersonId, note })
      .pipe(map((r) => r.data));
  }

  mark(childId: string, date: string, status: AttendanceStatus, absenceReason?: string) {
    return this.http
      .post<ApiSuccess<AttendanceRecord>>(`${this.base}/mark`, { childId, date, status, absenceReason })
      .pipe(map((r) => r.data));
  }

  childCalendar(childId: string, month: string) {
    return this.http
      .get<ApiSuccess<AttendanceRecord[]>>(`${this.base}/child/${childId}/calendar`, { params: { month } })
      .pipe(map((r) => r.data));
  }

  summary(groupId: string, from: string, to: string) {
    return this.http
      .get<ApiSuccess<{ total: number; present: number; absent: number; percentage: number }>>(`${this.base}/summary`, {
        params: { groupId, from, to },
      })
      .pipe(map((r) => r.data));
  }
}
