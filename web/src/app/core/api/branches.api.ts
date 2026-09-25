import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { Branch } from './models';

@Injectable({ providedIn: 'root' })
export class BranchesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/branches`;

  list() {
    return this.http.get<ApiSuccess<Branch[]>>(this.base).pipe(map((r) => r.data));
  }
}
