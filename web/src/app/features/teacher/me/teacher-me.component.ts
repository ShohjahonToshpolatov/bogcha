import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { StaffApi } from '../../../core/api/staff.api';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher.component';

const ROLE_LABEL_KEYS: Record<string, string> = {
  ADMIN: 'staff.roleAdmin',
  TEACHER: 'staff.roleTeacher',
  NURSE: 'staff.roleNurse',
  COOK: 'staff.roleCook',
};

@Component({
  selector: 'app-teacher-me',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, TranslatePipe, AvatarComponent, LanguageSwitcherComponent],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <div class="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-5 text-white shadow-md">
        <app-avatar [fullName]="auth.currentUser()?.fullName ?? ''" [photoUrl]="null" [size]="56" />
        <div>
          <div class="text-lg font-semibold">{{ auth.currentUser()?.fullName }}</div>
          <div class="text-sm opacity-90">{{ roleLabel() | translate }} · {{ auth.currentUser()?.phone }}</div>
        </div>
      </div>

      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div class="mb-3 text-sm font-semibold text-[var(--color-text-muted)]">{{ 'attendance.checkIn' | translate }} / {{ 'attendance.checkOut' | translate }}</div>
        <div class="flex gap-2">
          <button mat-flat-button color="primary" class="!flex-1 !h-11" (click)="checkIn()">
            <mat-icon>login</mat-icon>
            {{ 'attendance.checkIn' | translate }}
          </button>
          <button mat-stroked-button class="!flex-1 !h-11" (click)="checkOut()">
            <mat-icon>logout</mat-icon>
            {{ 'attendance.checkOut' | translate }}
          </button>
        </div>
        @if (lastAction()) {
          <p class="mt-2 text-center text-xs text-success">{{ lastAction() }}</p>
        }
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <span class="text-sm font-medium">{{ 'common.language' | translate }}</span>
        <app-language-switcher />
      </div>

      <button mat-stroked-button class="!h-12 !text-danger" (click)="auth.logout()">
        <mat-icon class="text-danger">logout</mat-icon>
        {{ 'common.logout' | translate }}
      </button>
    </div>
  `,
})
export class TeacherMeComponent {
  readonly auth = inject(AuthService);
  private readonly staffApi = inject(StaffApi);
  private readonly toast = inject(ToastService);

  readonly lastAction = signal<string | null>(null);

  roleLabel(): string {
    const role = this.auth.currentUser()?.role ?? '';
    return ROLE_LABEL_KEYS[role] ?? role;
  }

  checkIn(): void {
    this.staffApi.checkIn().subscribe({
      next: () => {
        this.toast.success('common.success');
        this.lastAction.set(`${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`);
      },
      error: () => this.toast.error('common.error'),
    });
  }

  checkOut(): void {
    this.staffApi.checkOut().subscribe({
      next: () => {
        this.toast.success('common.success');
        this.lastAction.set(`${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`);
      },
      error: () => this.toast.error('common.error'),
    });
  }
}
