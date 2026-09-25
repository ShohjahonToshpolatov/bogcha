import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { AnnouncementsApi } from '../../../core/api/announcements.api';
import { GroupsApi } from '../../../core/api/groups.api';
import { Announcement, Group } from '../../../core/api/models';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { UzDatePipe } from '../../../shared/pipes/uz-date.pipe';
import { AnnouncementFormDialogComponent } from './announcement-form-dialog.component';

@Component({
  selector: 'app-owner-announcements',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, EmptyStateComponent, UzDatePipe],
  template: `
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">{{ 'announcements.title' | translate }}</h1>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon>
        {{ 'announcements.create' | translate }}
      </button>
    </div>

    @if (loading()) {
      <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
    } @else if (announcements().length === 0) {
      <app-empty-state icon="campaign" [title]="'announcements.noAnnouncements' | translate" />
    } @else {
      <div class="mt-4 flex flex-col gap-3">
        @for (a of announcements(); track a.id) {
          <div class="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            @if (a.isPinned) {
              <div class="flex items-center gap-1.5 bg-accent/15 px-4 py-1.5 text-xs font-medium text-[#8a5a00]">
                <mat-icon class="!h-3.5 !w-3.5 !text-sm">push_pin</mat-icon>
                {{ 'announcements.pin' | translate }}
              </div>
            }
            <div class="p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <mat-icon class="!text-lg text-primary">campaign</mat-icon>
                  </div>
                  <div>
                    <div class="font-semibold">{{ a.title }}</div>
                    <p class="mt-0.5 text-sm text-[var(--color-text)]">{{ a.body }}</p>
                  </div>
                </div>
                <button mat-icon-button (click)="remove(a)">
                  <mat-icon class="!text-lg text-[var(--color-text-muted)]">delete</mat-icon>
                </button>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                <span class="rounded-full bg-[var(--color-bg)] px-2 py-0.5">{{ a.group?.name ?? ('announcements.allGroups' | translate) }}</span>
                <span>{{ a.publishAt | uzDate }}</span>
                <span class="ml-auto flex items-center gap-1">
                  <mat-icon class="!h-3.5 !w-3.5 !text-sm">visibility</mat-icon>
                  {{ 'announcements.readCount' | translate: { count: a._count?.reads ?? 0 } }}
                </span>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class OwnerAnnouncementsComponent implements OnInit {
  private readonly api = inject(AnnouncementsApi);
  private readonly groupsApi = inject(GroupsApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly announcements = signal<Announcement[]>([]);
  private groups: Group[] = [];

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    forkJoin([this.api.list(), this.groupsApi.list()]).subscribe({
      next: ([announcements, groups]) => {
        this.announcements.set(announcements);
        this.groups = groups;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    const ref = this.dialog.open(AnnouncementFormDialogComponent, { width: '480px', data: { groups: this.groups } });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.api.create(result).subscribe({
        next: () => {
          this.toast.success('common.success');
          this.refresh();
        },
        error: () => this.toast.error('common.error'),
      });
    });
  }

  remove(a: Announcement): void {
    this.api.remove(a.id).subscribe({
      next: () => {
        this.toast.success('common.success');
        this.refresh();
      },
      error: () => this.toast.error('common.error'),
    });
  }
}
