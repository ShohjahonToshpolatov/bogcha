import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { UpsertWaitlistInput, WaitlistItem, WaitlistStatus } from './models';

@Injectable({ providedIn: 'root' })
export class WaitlistApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/waitlist`;

  list() {
    return this.http.get<ApiSuccess<WaitlistItem[]>>(this.base).pipe(map((r) => r.data));
  }

  create(input: UpsertWaitlistInput) {
    return this.http.post<ApiSuccess<WaitlistItem>>(this.base, input).pipe(map((r) => r.data));
  }

  updateStatus(id: string, status: WaitlistStatus) {
    return this.http.patch<ApiSuccess<WaitlistItem>>(`${this.base}/${id}`, { status }).pipe(map((r) => r.data));
  }

  convert(id: string) {
    return this.http.post<ApiSuccess<unknown>>(`${this.base}/${id}/convert`, {}).pipe(map((r) => r.data));
  }

  remove(id: string) {
    return this.http.delete<ApiSuccess<void>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }
}
