import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { InviteStaffInput, StaffMember } from './models';

@Injectable({ providedIn: 'root' })
export class StaffApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/staff`;

  list() {
    return this.http.get<ApiSuccess<StaffMember[]>>(this.base).pipe(map((r) => r.data));
  }

  invite(input: InviteStaffInput) {
    return this.http
      .post<ApiSuccess<StaffMember & { tempPassword: string }>>(`${this.base}/invite`, input)
      .pipe(map((r) => r.data));
  }

  update(id: string, input: Partial<{ fullName: string; position: string; status: string }>) {
    return this.http.patch<ApiSuccess<StaffMember>>(`${this.base}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: string) {
    return this.http.delete<ApiSuccess<void>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  checkIn() {
    return this.http.post<ApiSuccess<unknown>>(`${this.base}/attendance/check-in`, {}).pipe(map((r) => r.data));
  }

  checkOut() {
    return this.http.post<ApiSuccess<unknown>>(`${this.base}/attendance/check-out`, {}).pipe(map((r) => r.data));
  }
}
