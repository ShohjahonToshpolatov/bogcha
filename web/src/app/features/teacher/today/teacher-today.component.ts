import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AttendanceApi } from '../../../core/api/attendance.api';
import { AttendanceStatus, DailyAttendanceEntry } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-teacher-today',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    AvatarComponent,
    EmptyStateComponent,
    StatCardComponent,
  ],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <div
        class="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-5 text-white shadow-md"
      >
        <div class="text-sm opacity-90">{{ greeting() }}</div>
        <div class="mt-0.5 text-xl font-semibold">{{ teacherName() }}</div>
        @if (groupName()) {
          <div class="mt-1 flex items-center gap-1.5 text-sm opacity-90">
            <mat-icon class="!h-4 !w-4 !text-base">groups</mat-icon>
            {{ groupName() }}
          </div>
        }
      </div>

      @if (!loading() && groupName()) {
        <div class="grid grid-cols-3 gap-2">
          <app-stat-card icon="check_circle" [value]="presentCount()" [label]="'attendance.present' | translate" color="success" />
          <app-stat-card icon="cancel" [value]="absentCount()" [label]="'attendance.absent' | translate" color="danger" />
          <app-stat-card icon="groups" [value]="entries().length" [label]="'children.title' | translate" color="primary" />
        </div>
      }

      @if (loading()) {
        <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
      } @else if (!groupName()) {
        <app-empty-state icon="groups" [title]="'groups.noTeacher' | translate" />
      } @else if (entries().length === 0) {
        <app-empty-state icon="child_care" [title]="'children.noChildren' | translate" />
      } @else {
        <div class="flex flex-col gap-2.5">
          @for (entry of entries(); track entry.child.id) {
            <div
              class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
            >
              <div
                class="h-1"
                [class.bg-success]="entry.attendance?.status === 'PRESENT'"
                [class.bg-danger]="entry.attendance?.status === 'ABSENT'"
                [class.bg-[var(--color-border)]]="!entry.attendance"
              ></div>
              <div class="p-3.5">
                <div class="flex items-center gap-3">
                  <app-avatar [fullName]="entry.child.firstName + ' ' + entry.child.lastName" [photoUrl]="entry.child.photoUrl" [size]="46" />
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-medium">{{ entry.child.firstName }} {{ entry.child.lastName }}</div>
                    @if (entry.child.allergies?.length) {
                      <div class="mt-0.5 inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                        ⚠️ {{ entry.child.allergies?.[0]?.title }}
                      </div>
                    } @else if (entry.attendance?.checkInAt) {
                      <div class="mt-0.5 text-xs text-success">
                        {{ 'attendance.checkIn' | translate }}: {{ formatTime(entry.attendance!.checkInAt!) }}
                      </div>
                    }
                  </div>
                </div>
                <div class="mt-3 flex gap-2">
                  <button
                    class="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors"
                    [class.bg-success]="entry.attendance?.status === 'PRESENT'"
                    [class.text-white]="entry.attendance?.status === 'PRESENT'"
                    [class.bg-[var(--color-bg)]]="entry.attendance?.status !== 'PRESENT'"
                    [class.text-[var(--color-text-muted)]]="entry.attendance?.status !== 'PRESENT'"
                    (click)="checkIn(entry)"
                  >
                    <mat-icon class="!h-4 !w-4 !text-base">check</mat-icon>
                    {{ 'attendance.present' | translate }}
                  </button>
                  <button
                    class="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors"
                    [class.bg-danger]="entry.attendance?.status === 'ABSENT'"
                    [class.text-white]="entry.attendance?.status === 'ABSENT'"
                    [class.bg-[var(--color-bg)]]="entry.attendance?.status !== 'ABSENT'"
                    [class.text-[var(--color-text-muted)]]="entry.attendance?.status !== 'ABSENT'"
                    (click)="markAbsent(entry)"
                  >
                    <mat-icon class="!h-4 !w-4 !text-base">close</mat-icon>
                    {{ 'attendance.absent' | translate }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TeacherTodayComponent implements OnInit {
  private readonly attendanceApi = inject(AttendanceApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly entries = signal<DailyAttendanceEntry[]>([]);
  private groupId: string | null = null;
  readonly groupName = signal<string | null>(null);

  teacherName(): string {
    return this.auth.currentUser()?.fullName ?? '';
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return this.translate.instant('common.goodMorning');
    if (hour < 18) return this.translate.instant('common.goodAfternoon');
    return this.translate.instant('common.goodEvening');
  }

  ngOnInit(): void {
    const links = this.auth.currentUser()?.groupTeacherLinks ?? [];
    this.groupId = links[0]?.groupId ?? null;
    if (!this.groupId) {
      this.loading.set(false);
      return;
    }
    this.groupName.set('Guruh');
    this.refresh();
  }

  presentCount(): number {
    return this.entries().filter((e) => e.attendance?.status === 'PRESENT').length;
  }

  absentCount(): number {
    return this.entries().filter((e) => e.attendance?.status === 'ABSENT').length;
  }

  refresh(): void {
    if (!this.groupId) return;
    this.loading.set(true);
    this.attendanceApi.daily(this.groupId, today()).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.groupName.set(entries[0]?.child.group?.name ?? 'Guruh');
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  checkIn(entry: DailyAttendanceEntry): void {
    this.attendanceApi.checkIn(entry.child.id).subscribe({
      next: () => {
        this.toast.success('common.success');
        this.refresh();
      },
      error: () => this.toast.error('common.error'),
    });
  }

  markAbsent(entry: DailyAttendanceEntry): void {
    this.attendanceApi.mark(entry.child.id, today(), AttendanceStatus.ABSENT).subscribe({
      next: () => {
        this.toast.success('common.success');
        this.refresh();
      },
      error: () => this.toast.error('common.error'),
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  }
}
