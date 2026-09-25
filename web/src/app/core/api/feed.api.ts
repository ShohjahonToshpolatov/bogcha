import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { CreatePostInput, DailyPost, PageMeta } from './models';

@Injectable({ providedIn: 'root' })
export class FeedApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/feed`;

  list(query: { groupId?: string; childId?: string; page?: number } = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params = params.set(key, String(value));
    });
    return this.http
      .get<ApiSuccess<DailyPost[]> & { meta: PageMeta }>(this.base, { params })
      .pipe(map((r) => ({ items: r.data, meta: r.meta })));
  }

  create(input: CreatePostInput) {
    return this.http.post<ApiSuccess<DailyPost>>(this.base, input).pipe(map((r) => r.data));
  }
}
