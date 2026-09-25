import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { ThreadListItem, ThreadMessage } from './models';

@Injectable({ providedIn: 'root' })
export class MessagingApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/messaging`;

  listThreads() {
    return this.http.get<ApiSuccess<ThreadListItem[]>>(`${this.base}/threads`).pipe(map((r) => r.data));
  }

  getMessages(threadId: string) {
    return this.http
      .get<ApiSuccess<ThreadMessage[]> & { meta: unknown }>(`${this.base}/threads/${threadId}/messages`)
      .pipe(map((r) => r.data));
  }

  startOrSend(childId: string, body: string) {
    return this.http.post<ApiSuccess<ThreadMessage>>(`${this.base}/threads`, { childId, body }).pipe(map((r) => r.data));
  }

  sendMessage(threadId: string, body: string) {
    return this.http
      .post<ApiSuccess<ThreadMessage>>(`${this.base}/threads/${threadId}/messages`, { body })
      .pipe(map((r) => r.data));
  }

  markRead(threadId: string) {
    return this.http.post<ApiSuccess<{ success: boolean }>>(`${this.base}/threads/${threadId}/read`, {}).pipe(map((r) => r.data));
  }
}
