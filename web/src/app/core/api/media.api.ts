import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';

export interface UploadedMedia {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable({ providedIn: 'root' })
export class MediaApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/media`;

  upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiSuccess<UploadedMedia>>(`${this.base}/upload`, formData).pipe(map((r) => r.data));
  }
}
