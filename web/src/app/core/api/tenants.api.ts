import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { Tenant, UpdateTenantInput } from './models';

@Injectable({ providedIn: 'root' })
export class TenantsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tenants/current`;

  current() {
    return this.http.get<ApiSuccess<Tenant>>(this.base).pipe(map((r) => r.data));
  }

  update(input: UpdateTenantInput) {
    return this.http.patch<ApiSuccess<Tenant>>(this.base, input).pipe(map((r) => r.data));
  }
}
