import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

/**
 * WebSocket ulanishi (3.7-bo'lim): message.new, attendance.updated, feed.new,
 * announcement.new, notification.new, camera.status kabi real-time hodisalar uchun.
 */
@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  constructor(private readonly auth: AuthService) {}

  connect(): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.wsUrl, {
      auth: { token: this.auth.accessToken },
      transports: ['websocket'],
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      if (!this.socket) this.connect();
      const handler = (payload: T) => subscriber.next(payload);
      this.socket?.on(event, handler);
      return () => this.socket?.off(event, handler);
    });
  }

  emit(event: string, payload?: unknown): void {
    this.socket?.emit(event, payload);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
