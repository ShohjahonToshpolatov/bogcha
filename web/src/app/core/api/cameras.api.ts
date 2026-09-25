import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { Camera, CameraAccessLog, CameraSession, UpsertCameraInput } from './models';

@Injectable({ providedIn: 'root' })
export class CamerasApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/cameras`;

  list() {
    return this.http.get<ApiSuccess<Camera[]>>(this.base).pipe(map((r) => r.data));
  }

  create(input: UpsertCameraInput) {
    return this.http.post<ApiSuccess<Camera>>(this.base, input).pipe(map((r) => r.data));
  }

  update(id: string, input: Partial<UpsertCameraInput>) {
    return this.http.patch<ApiSuccess<Camera>>(`${this.base}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: string) {
    return this.http.delete<ApiSuccess<void>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  test(id: string) {
    return this.http.post<ApiSuccess<{ reachable: boolean }>>(`${this.base}/${id}/test`, {}).pipe(map((r) => r.data));
  }

  startSession(id: string) {
    return this.http.post<ApiSuccess<CameraSession>>(`${this.base}/${id}/session`, {}).pipe(map((r) => r.data));
  }

  heartbeat(id: string, sessionId: string) {
    return this.http.post<ApiSuccess<{ ok: boolean }>>(`${this.base}/${id}/session/${sessionId}/heartbeat`, {}).pipe(map((r) => r.data));
  }

  endSession(id: string, sessionId: string) {
    return this.http.delete<ApiSuccess<void>>(`${this.base}/${id}/session/${sessionId}`).pipe(map((r) => r.data));
  }

  accessLogs(id: string) {
    return this.http.get<ApiSuccess<CameraAccessLog[]>>(`${this.base}/${id}/access-logs`).pipe(map((r) => r.data));
  }
}
