import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { FeedApi } from '../../../core/api/feed.api';
import { MediaApi } from '../../../core/api/media.api';
import { PostType } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface QuickTemplate {
  key: string;
  labelKey: string;
}

interface PendingPhoto {
  localId: string;
  previewUrl: string;
  uploading: boolean;
  mediaId: string | null;
  failed: boolean;
}

const TEMPLATES: QuickTemplate[] = [
  { key: 'walk', labelKey: 'feed.activityWalk' },
  { key: 'draw', labelKey: 'feed.activityDraw' },
  { key: 'story', labelKey: 'feed.activityStory' },
  { key: 'sport', labelKey: 'feed.activitySport' },
];

@Component({
  selector: 'app-teacher-feed-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <h1 class="text-xl font-semibold">{{ 'feed.createPost' | translate }}</h1>

      <div class="flex flex-wrap gap-2">
        @for (tpl of templates; track tpl.key) {
          <button
            type="button"
            class="rounded-full border px-3 py-1.5 text-sm"
            [class.bg-primary]="selectedTemplate === tpl.key"
            [class.text-white]="selectedTemplate === tpl.key"
            [class.border-primary]="selectedTemplate === tpl.key"
            [class.border-[var(--color-border)]]="selectedTemplate !== tpl.key"
            (click)="selectTemplate(tpl)"
          >
            {{ tpl.labelKey | translate }}
          </button>
        }
      </div>

      <!-- Rasmlar -->
      <div class="flex flex-wrap gap-2">
        @for (photo of photos(); track photo.localId) {
          <div class="relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--color-border)]">
            <img [src]="photo.previewUrl" class="h-full w-full object-cover" alt="" />
            @if (photo.uploading) {
              <div class="absolute inset-0 flex items-center justify-center bg-black/40">
                <mat-spinner diameter="24" color="accent" />
              </div>
            }
            @if (photo.failed) {
              <div class="absolute inset-0 flex items-center justify-center bg-danger/70">
                <mat-icon class="text-white">error</mat-icon>
              </div>
            }
            <button
              type="button"
              class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              (click)="removePhoto(photo)"
            >
              <mat-icon class="!h-3.5 !w-3.5 !text-sm">close</mat-icon>
            </button>
          </div>
        }
        <button
          type="button"
          class="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]"
          (click)="fileInput.click()"
        >
          <mat-icon>add_a_photo</mat-icon>
          <span class="text-[10px]">{{ 'common.add' | translate }}</span>
        </button>
        <input #fileInput type="file" accept="image/*" multiple hidden (change)="onFilesSelected($event)" />
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'feed.postBody' | translate }}</mat-label>
          <textarea matInput formControlName="body" rows="4"></textarea>
        </mat-form-field>

        <button mat-flat-button color="primary" type="submit" class="!h-12" [disabled]="!canSubmit() || submitting">
          <mat-icon>send</mat-icon>
          {{ 'feed.publish' | translate }}
        </button>
      </form>
    </div>
  `,
})
export class TeacherFeedCreateComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly feedApi = inject(FeedApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly templates = TEMPLATES;
  readonly photos = signal<PendingPhoto[]>([]);
  selectedTemplate: string | null = null;
  submitting = false;

  readonly form = this.fb.nonNullable.group({
    body: [''],
  });

  canSubmit(): boolean {
    const hasText = !!this.form.getRawValue().body?.trim();
    const hasPhoto = this.photos().some((p) => p.mediaId);
    const anyUploading = this.photos().some((p) => p.uploading);
    return (hasText || hasPhoto) && !anyUploading;
  }

  selectTemplate(tpl: QuickTemplate): void {
    this.selectedTemplate = tpl.key;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    for (const file of files) {
      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      const photo: PendingPhoto = { localId, previewUrl, uploading: true, mediaId: null, failed: false };
      this.photos.update((list) => [...list, photo]);

      this.mediaApi.upload(file).subscribe({
        next: (media) => {
          this.photos.update((list) => list.map((p) => (p.localId === localId ? { ...p, uploading: false, mediaId: media.id } : p)));
        },
        error: () => {
          this.photos.update((list) => list.map((p) => (p.localId === localId ? { ...p, uploading: false, failed: true } : p)));
          this.toast.error('common.error');
        },
      });
    }
  }

  removePhoto(photo: PendingPhoto): void {
    URL.revokeObjectURL(photo.previewUrl);
    this.photos.update((list) => list.filter((p) => p.localId !== photo.localId));
  }

  submit(): void {
    if (!this.canSubmit()) return;
    const groupId = this.auth.currentUser()?.groupTeacherLinks?.[0]?.groupId;
    if (!groupId) return;

    const mediaIds = this.photos()
      .map((p) => p.mediaId)
      .filter((id): id is string => !!id);

    this.submitting = true;
    this.feedApi
      .create({
        groupId,
        type: mediaIds.length ? PostType.PHOTO : PostType.ACTIVITY,
        body: this.form.getRawValue().body || undefined,
        activityTag: this.selectedTemplate ?? undefined,
        mediaIds,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.toast.success('feed.postCreated');
          this.form.reset();
          this.selectedTemplate = null;
          this.photos().forEach((p) => URL.revokeObjectURL(p.previewUrl));
          this.photos.set([]);
        },
        error: () => {
          this.submitting = false;
          this.toast.error('common.error');
        },
      });
  }
}
