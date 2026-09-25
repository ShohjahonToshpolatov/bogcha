import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { MealType, MenuDay } from './models';

export interface UpsertMenuDayInput {
  branchId: string;
  date: string;
  mealType: MealType;
  dishes: { name: string; portion?: string; allergens?: string[] }[];
}

@Injectable({ providedIn: 'root' })
export class MenuApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/menu`;

  list(branchId: string, from: string, to: string) {
    return this.http
      .get<ApiSuccess<MenuDay[]>>(this.base, { params: { branchId, from, to } })
      .pipe(map((r) => r.data));
  }

  upsert(input: UpsertMenuDayInput) {
    return this.http.post<ApiSuccess<MenuDay>>(this.base, input).pipe(map((r) => r.data));
  }

  copyWeek(fromWeekStart: string, toWeekStart: string, branchId: string) {
    return this.http
      .post<ApiSuccess<{ copied: number }>>(`${this.base}/copy-week`, { fromWeekStart, toWeekStart, branchId })
      .pipe(map((r) => r.data));
  }

  remove(id: string) {
    return this.http.delete<ApiSuccess<void>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }
}
