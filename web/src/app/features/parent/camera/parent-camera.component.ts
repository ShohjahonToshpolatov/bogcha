import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import Hls from 'hls.js';
import { CamerasApi } from '../../../core/api/cameras.api';
import { Camera, CameraSession } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-parent-camera',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, EmptyStateComponent],
  template: `
    <div class="flex flex-col gap-3 p-4">
      <h1 class="text-xl font-semibold">{{ 'nav.camera' | translate }}</h1>

      @if (loading()) {
        <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
      } @else if (!activeCamera()) {
        @if (cameras().length === 0) {
          <app-empty-state icon="videocam" [title]="'cameras.notAvailable' | translate" />
        } @else {
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            @for (cam of cameras(); track cam.id) {
              <mat-card class="!rounded-lg !p-4">
                <div class="flex items-center gap-2">
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    [class.bg-success]="cam.status === 'ONLINE'"
                    [class.bg-danger]="cam.status !== 'ONLINE'"
                  ></span>
                  <span class="font-medium">{{ cam.name }}</span>
                </div>
                <div class="mt-1 text-xs text-[var(--color-text-muted)]">{{ cam.group?.name }}</div>
                <button mat-flat-button color="primary" class="mt-3 w-full" (click)="open(cam)">
                  <mat-icon>play_arrow</mat-icon>
                  {{ 'cameras.startSession' | translate }}
                </button>
              </mat-card>
            }
          </div>
        }
      } @else {
        <div class="relative overflow-hidden rounded-lg bg-black" style="aspect-ratio: 16/9;" oncontextmenu="return false">
          <video
            #videoEl
            class="h-full w-full"
            autoplay
            playsinline
            muted
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
          ></video>

          @if (streamError()) {
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center text-white">
              <mat-icon class="!text-4xl">videocam_off</mat-icon>
              <p class="max-w-xs text-sm">{{ streamError() | translate }}</p>
            </div>
          }

          <div class="absolute left-2 top-2 flex items-center gap-1 rounded bg-danger/90 px-2 py-0.5 text-xs font-semibold text-white">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span>
            {{ 'cameras.liveNow' | translate }}
          </div>
          <div class="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
            {{ formatRemaining() }}
          </div>
          <div class="absolute bottom-2 left-2 rounded bg-black/40 px-2 py-0.5 text-xs text-white/80">
            {{ auth.currentUser()?.fullName }} · {{ nowLabel }}
          </div>
        </div>
        <button mat-stroked-button class="mt-3" (click)="close()">
          <mat-icon>close</mat-icon>
          {{ 'common.close' | translate }}
        </button>
      }
    </div>
  `,
})
export class ParentCameraComponent implements OnInit, OnDestroy {
  private readonly camerasApi = inject(CamerasApi);
  readonly auth = inject(AuthService);

  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  readonly loading = signal(true);
  readonly cameras = signal<Camera[]>([]);
  readonly activeCamera = signal<Camera | null>(null);
  readonly streamError = signal<string | null>(null);
  readonly nowLabel = new Date().toLocaleString('uz-UZ');

  private session: CameraSession | null = null;
  private hls: Hls | null = null;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private countdownTimer?: ReturnType<typeof setInterval>;
  private secondsRemaining = 0;

  ngOnInit(): void {
    this.camerasApi.list().subscribe({
      next: (cams) => {
        this.cameras.set(cams);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  formatRemaining(): string {
    const m = Math.floor(this.secondsRemaining / 60);
    const s = this.secondsRemaining % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  open(camera: Camera): void {
    this.activeCamera.set(camera);
    this.streamError.set(null);

    this.camerasApi.startSession(camera.id).subscribe({
      next: (session) => {
        this.session = session;
        this.secondsRemaining = session.maxSeconds;
        this.attachPlayer(session.hlsUrl);
        this.startHeartbeat(camera.id, session.sessionId);
        this.startCountdown();
      },
      error: (err) => {
        this.streamError.set(
          err.status === 403 ? this.translateForbidden(err) : "cameras.offlineMessage",
        );
      },
    });
  }

  private translateForbidden(err: { error?: { error?: { message?: string } } }): string {
    return err.error?.error?.message ?? 'cameras.outsideSchedule';
  }

  private attachPlayer(hlsUrl: string): void {
    const video = this.videoEl?.nativeElement;
    if (!video) return;

    if (Hls.isSupported()) {
      this.hls = new Hls({ manifestLoadingMaxRetry: 1, manifestLoadingRetryDelay: 500 });
      this.hls.loadSource(hlsUrl);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          this.streamError.set('cameras.streamPending');
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
    } else {
      this.streamError.set('cameras.streamPending');
    }
  }

  private startHeartbeat(cameraId: string, sessionId: string): void {
    this.heartbeatTimer = setInterval(() => {
      this.camerasApi.heartbeat(cameraId, sessionId).subscribe({ error: () => undefined });
    }, 30_000);
  }

  private startCountdown(): void {
    this.countdownTimer = setInterval(() => {
      this.secondsRemaining -= 1;
      if (this.secondsRemaining <= 0) {
        this.streamError.set('cameras.sessionEnded');
        this.teardown();
      }
    }, 1000);
  }

  close(): void {
    this.teardown();
    this.activeCamera.set(null);
  }

  private teardown(): void {
    if (this.activeCamera() && this.session) {
      this.camerasApi.endSession(this.activeCamera()!.id, this.session.sessionId).subscribe({ error: () => undefined });
    }
    this.hls?.destroy();
    this.hls = null;
    this.session = null;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }
}
