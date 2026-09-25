import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { Announcement, UpsertAnnouncementInput } from './models';

@Injectable({ providedIn: 'root' })
export class AnnouncementsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/announcements`;

  list() {
    return this.http.get<ApiSuccess<Announcement[]>>(this.base).pipe(map((r) => r.data));
  }

  create(input: UpsertAnnouncementInput) {
    return this.http.post<ApiSuccess<Announcement>>(this.base, input).pipe(map((r) => r.data));
  }

  remove(id: string) {
    return this.http.delete<ApiSuccess<void>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  markRead(id: string) {
    return this.http.post<ApiSuccess<void>>(`${this.base}/${id}/read`, {}).pipe(map((r) => r.data));
  }

  readStats(id: string) {
    return this.http
      .get<ApiSuccess<{ user: { id: string; fullName: string } }[]>>(`${this.base}/${id}/read-stats`)
      .pipe(map((r) => r.data));
  }
}
