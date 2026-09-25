import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AttendanceApi } from '../../../core/api/attendance.api';
import { BillingApi } from '../../../core/api/billing.api';
import { ChildrenApi } from '../../../core/api/children.api';
import { FeedApi } from '../../../core/api/feed.api';
import { AttendanceRecord, Child, DailyPost, Debt } from '../../../core/api/models';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { UzMoneyPipe } from '../../../shared/pipes/uz-money.pipe';

const MOOD_ICONS: Record<string, string> = {
  HAPPY: 'sentiment_very_satisfied',
  CALM: 'sentiment_satisfied',
  TIRED: 'sentiment_neutral',
  UPSET: 'sentiment_dissatisfied',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-parent-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule, TranslatePipe, AvatarComponent, UzMoneyPipe],
  template: `
    <div class="flex flex-col gap-4 p-4">
      @if (child(); as c) {
        <!-- Bola kartochkasi -->
        <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <app-avatar [fullName]="c.firstName + ' ' + c.lastName" [photoUrl]="c.photoUrl" [size]="56" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-lg font-semibold">{{ c.firstName }} {{ c.lastName }}</div>
            @if (c.group) {
              <div class="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                <span class="h-2 w-2 rounded-full" [style.background]="c.group.colorHex"></span>
                {{ c.group.name }}
              </div>
            }
          </div>
          @if (todayAttendance()?.checkInAt) {
            <div class="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
              <span class="h-2 w-2 rounded-full bg-success"></span>
              {{ formatTime(todayAttendance()!.checkInAt!) }}
            </div>
          } @else {
            <div class="flex items-center gap-1.5 rounded-full bg-[var(--color-bg)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)]">
              {{ 'attendance.absent' | translate }}
            </div>
          }
        </div>

        @if (c.allergies?.length) {
          <div class="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            <mat-icon class="!h-5 !w-5 !text-xl">warning</mat-icon>
            {{ 'children.allergyWarning' | translate }}: {{ c.allergies?.[0]?.title }}
          </div>
        }

        <!-- To'lov holati -->
        @if (debt(); as d) {
          <div class="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-danger to-[#c73a3f] p-4 text-white shadow-md">
            <mat-icon class="!h-9 !w-9 !text-3xl">payments</mat-icon>
            <div class="flex-1">
              <div class="text-lg font-semibold">{{ d.remaining | uzMoney }}</div>
              <div class="text-xs opacity-90">{{ 'parent.debt' | translate }} · {{ d.number }}</div>
            </div>
            @if (d.daysOverdue > 0) {
              <div class="rounded-full bg-white/20 px-2 py-1 text-xs font-medium">{{ d.daysOverdue }} kun</div>
            }
          </div>
        } @else {
          <div class="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-success to-[#1f9d5f] p-4 text-white shadow-md">
            <mat-icon class="!h-9 !w-9 !text-3xl">check_circle</mat-icon>
            <div>
              <div class="text-base font-semibold">{{ 'finance.noDebts' | translate }}</div>
              <div class="text-xs opacity-90">{{ 'parent.debt' | translate }}</div>
            </div>
          </div>
        }

        <!-- Kunlik holat kartochkalari -->
        <div class="grid grid-cols-2 gap-3">
          <a routerLink="/parent/camera" class="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 no-underline shadow-sm transition-transform active:scale-[0.98]">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <mat-icon class="text-primary">videocam</mat-icon>
            </div>
            <div class="mt-2 text-sm font-medium text-[var(--color-text)]">{{ 'parent.camera' | translate }}</div>
            <div class="text-xs text-[var(--color-text-muted)]">{{ 'cameras.liveNow' | translate }}</div>
          </a>

          <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <mat-icon [class]="latestMood() ? 'text-accent' : 'text-[var(--color-text-muted)]'">{{ moodIcon() }}</mat-icon>
            </div>
            <div class="mt-2 text-sm font-medium">{{ 'parent.mood' | translate }}</div>
            <div class="text-xs text-[var(--color-text-muted)]">{{ latestMood() ? ('mood.' + latestMood() | translate) : '—' }}</div>
          </div>

          <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg)]">
              <mat-icon class="text-[var(--color-text-muted)]">restaurant</mat-icon>
            </div>
            <div class="mt-2 text-sm font-medium">{{ 'parent.meals' | translate }}</div>
            <div class="text-xs text-[var(--color-text-muted)]">—</div>
          </div>

          <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg)]">
              <mat-icon class="text-[var(--color-text-muted)]">bedtime</mat-icon>
            </div>
            <div class="mt-2 text-sm font-medium">{{ 'parent.nap' | translate }}</div>
            <div class="text-xs text-[var(--color-text-muted)]">—</div>
          </div>
        </div>
      } @else if (loading()) {
        <div class="flex justify-center py-16"><mat-spinner diameter="32" /></div>
      }
    </div>
  `,
})
export class ParentHomeComponent implements OnInit {
  private readonly childrenApi = inject(ChildrenApi);
  private readonly attendanceApi = inject(AttendanceApi);
  private readonly billingApi = inject(BillingApi);
  private readonly feedApi = inject(FeedApi);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly child = signal<Child | null>(null);
  readonly todayAttendance = signal<AttendanceRecord | null>(null);
  readonly debt = signal<Debt | null>(null);
  readonly latestMood = signal<string | null>(null);

  moodIcon(): string {
    const mood = this.latestMood();
    return mood ? (MOOD_ICONS[mood] ?? 'mood') : 'mood';
  }

  ngOnInit(): void {
    this.childrenApi.list({ limit: 1 }).subscribe({
      next: (result) => {
        const child = result.items[0];
        if (!child) {
          this.loading.set(false);
          return;
        }
        this.child.set(child);
        this.loadDetails(child.id);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadDetails(childId: string): void {
    const month = todayIso().slice(0, 7);
    forkJoin([
      this.attendanceApi.childCalendar(childId, month).pipe(catchError(() => of([]))),
      this.billingApi.myDebt().pipe(catchError(() => of([]))),
      this.feedApi.list({ childId }).pipe(catchError(() => of({ items: [] as DailyPost[], meta: null }))),
    ]).subscribe(([calendar, debts, feed]) => {
      const today = calendar.find((a) => a.date.slice(0, 10) === todayIso());
      this.todayAttendance.set(today ?? null);
      this.debt.set(debts[0] ?? null);
      const moodPost = feed.items.find((p) => p.mood);
      this.latestMood.set(moodPost?.mood ?? null);
      this.loading.set(false);
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  }
}
