import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { Child, CreateChildInput, PageMeta } from './models';

export interface QueryChildrenInput {
  groupId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ChildrenApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/children`;

  list(query: QueryChildrenInput = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    });
    return this.http
      .get<ApiSuccess<Child[]> & { meta: PageMeta }>(this.base, { params })
      .pipe(map((r) => ({ items: r.data, meta: r.meta })));
  }

  get(id: string) {
    return this.http.get<ApiSuccess<Child>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  create(input: CreateChildInput) {
    return this.http.post<ApiSuccess<Child>>(this.base, input).pipe(map((r) => r.data));
  }

  update(id: string, input: Partial<CreateChildInput>) {
    return this.http.patch<ApiSuccess<Child>>(`${this.base}/${id}`, input).pipe(map((r) => r.data));
  }

  archive(id: string, reason: string) {
    return this.http.post<ApiSuccess<Child>>(`${this.base}/${id}/archive`, { reason }).pipe(map((r) => r.data));
  }
}
