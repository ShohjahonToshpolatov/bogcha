import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { WaitlistApi } from '../../../core/api/waitlist.api';
import { WaitlistItem, WaitlistStatus } from '../../../core/api/models';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { UzDatePipe } from '../../../shared/pipes/uz-date.pipe';
import { WaitlistFormDialogComponent } from './waitlist-form-dialog.component';

const STATUS_LABELS: Record<WaitlistStatus, string> = {
  [WaitlistStatus.NEW]: 'waitlist.statusNew',
  [WaitlistStatus.CONTACTED]: 'waitlist.statusContacted',
  [WaitlistStatus.TOUR_BOOKED]: 'waitlist.statusTour',
  [WaitlistStatus.ENROLLED]: 'waitlist.statusEnrolled',
  [WaitlistStatus.REJECTED]: 'waitlist.statusRejected',
};

const STATUS_COLORS: Record<WaitlistStatus, string> = {
  [WaitlistStatus.NEW]: 'bg-primary/10 text-primary',
  [WaitlistStatus.CONTACTED]: 'bg-accent/15 text-[#8a5a00]',
  [WaitlistStatus.TOUR_BOOKED]: 'bg-accent/15 text-[#8a5a00]',
  [WaitlistStatus.ENROLLED]: 'bg-success/10 text-success',
  [WaitlistStatus.REJECTED]: 'bg-danger/10 text-danger',
};

@Component({
  selector: 'app-owner-waitlist',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, TranslatePipe, EmptyStateComponent, StatCardComponent, UzDatePipe],
  template: `
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">{{ 'waitlist.title' | translate }}</h1>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon>
        {{ 'waitlist.addApplication' | translate }}
      </button>
    </div>

    @if (!loading() && items().length > 0) {
      <div class="mt-4 grid grid-cols-3 gap-3">
        <app-stat-card icon="pending_actions" [value]="countByStatus(WaitlistStatus.NEW)" [label]="'waitlist.statusNew' | translate" color="primary" />
        <app-stat-card icon="event_available" [value]="countByStatus(WaitlistStatus.TOUR_BOOKED)" [label]="'waitlist.statusTour' | translate" color="accent" />
        <app-stat-card icon="how_to_reg" [value]="countByStatus(WaitlistStatus.ENROLLED)" [label]="'waitlist.statusEnrolled' | translate" color="success" />
      </div>
    }

    @if (loading()) {
      <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
    } @else if (items().length === 0) {
      <app-empty-state icon="pending_actions" [title]="'waitlist.noApplications' | translate" />
    } @else {
      <div class="mt-4 flex flex-col gap-2.5">
        @for (item of items(); track item.id) {
          <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-sm">
            <div class="min-w-0 flex-1">
              <div class="font-medium">{{ item.childName }}</div>
              <div class="truncate text-xs text-[var(--color-text-muted)]">
                {{ item.parentName }} · {{ item.parentPhone }} · {{ item.desiredStart | uzDate }}
              </div>
            </div>
            <button mat-button [matMenuTriggerFor]="statusMenu" [ngClass]="statusColor(item.status)" class="!rounded-full !text-xs !font-medium">
              {{ statusLabel(item.status) | translate }}
            </button>
            <mat-menu #statusMenu="matMenu">
              @for (s of statuses; track s) {
                <button mat-menu-item (click)="setStatus(item, s)">{{ statusLabel(s) | translate }}</button>
              }
            </mat-menu>
            @if (item.status !== 'ENROLLED') {
              <button mat-icon-button (click)="convert(item)" [attr.aria-label]="'waitlist.convert' | translate">
                <mat-icon class="text-success">how_to_reg</mat-icon>
              </button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class OwnerWaitlistComponent implements OnInit {
  private readonly api = inject(WaitlistApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly items = signal<WaitlistItem[]>([]);
  readonly statuses = Object.values(WaitlistStatus);
  readonly WaitlistStatus = WaitlistStatus;

  ngOnInit(): void {
    this.refresh();
  }

  statusLabel(status: WaitlistStatus): string {
    return STATUS_LABELS[status];
  }

  statusColor(status: WaitlistStatus): string {
    return STATUS_COLORS[status];
  }

  countByStatus(status: WaitlistStatus): number {
    return this.items().filter((i) => i.status === status).length;
  }

  refresh(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    const ref = this.dialog.open(WaitlistFormDialogComponent, { width: '420px' });
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

  setStatus(item: WaitlistItem, status: WaitlistStatus): void {
    this.api.updateStatus(item.id, status).subscribe({
      next: () => {
        this.toast.success('common.success');
        this.refresh();
      },
      error: () => this.toast.error('common.error'),
    });
  }

  convert(item: WaitlistItem): void {
    this.api.convert(item.id).subscribe({
      next: () => {
        this.toast.success('common.success');
        this.refresh();
      },
      error: () => this.toast.error('common.error'),
    });
  }
}
