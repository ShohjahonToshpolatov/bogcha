import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { Group } from './models';

export interface UpsertGroupInput {
  branchId: string;
  name: string;
  ageMin: number;
  ageMax: number;
  capacity: number;
  colorHex?: string;
}

@Injectable({ providedIn: 'root' })
export class GroupsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/groups`;

  list(branchId?: string) {
    let url = this.base;
    if (branchId) url += `?branchId=${branchId}`;
    return this.http.get<ApiSuccess<Group[]>>(url).pipe(map((r) => r.data));
  }

  get(id: string) {
    return this.http.get<ApiSuccess<Group>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  summary(id: string) {
    return this.http
      .get<ApiSuccess<{ childrenCount: number; presentToday: number; capacity: number }>>(`${this.base}/${id}/summary`)
      .pipe(map((r) => r.data));
  }

  create(input: UpsertGroupInput) {
    return this.http.post<ApiSuccess<Group>>(this.base, input).pipe(map((r) => r.data));
  }

  update(id: string, input: Partial<UpsertGroupInput>) {
    return this.http.patch<ApiSuccess<Group>>(`${this.base}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: string) {
    return this.http.delete<ApiSuccess<void>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  assignTeacher(groupId: string, userId: string, isMain = false) {
    return this.http
      .post<ApiSuccess<unknown>>(`${this.base}/${groupId}/teachers`, { userId, isMain })
      .pipe(map((r) => r.data));
  }
}
