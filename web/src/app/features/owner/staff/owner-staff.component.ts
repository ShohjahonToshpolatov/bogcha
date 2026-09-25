import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { GroupsApi } from '../../../core/api/groups.api';
import { Group, StaffMember } from '../../../core/api/models';
import { StaffApi } from '../../../core/api/staff.api';
import { ToastService } from '../../../core/services/toast.service';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { StaffInviteDialogComponent } from './staff-invite-dialog.component';
import { StaffTempPasswordDialogComponent } from './staff-temp-password-dialog.component';

const ROLE_LABEL_KEYS: Record<string, string> = {
  OWNER: 'staff.roleAdmin',
  ADMIN: 'staff.roleAdmin',
  TEACHER: 'staff.roleTeacher',
  NURSE: 'staff.roleNurse',
  COOK: 'staff.roleCook',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  ACTIVE: 'staff.statusActive',
  INVITED: 'staff.statusInvited',
  BLOCKED: 'staff.statusBlocked',
};

@Component({
  selector: 'app-owner-staff',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    AvatarComponent,
    EmptyStateComponent,
    StatCardComponent,
  ],
  template: `
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">{{ 'staff.title' | translate }}</h1>
      <button mat-flat-button color="primary" (click)="openInvite()">
        <mat-icon>person_add</mat-icon>
        {{ 'staff.inviteStaff' | translate }}
      </button>
    </div>

    @if (!loading() && staff().length > 0) {
      <div class="mt-4 grid grid-cols-3 gap-3">
        <app-stat-card icon="badge" [value]="staff().length" [label]="'staff.title' | translate" color="primary" />
        <app-stat-card icon="check_circle" [value]="activeCount()" [label]="'staff.statusActive' | translate" color="success" />
        <app-stat-card icon="school" [value]="teacherCount()" [label]="'staff.roleTeacher' | translate" color="accent" />
      </div>
    }

    @if (loading()) {
      <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
    } @else if (staff().length === 0) {
      <app-empty-state icon="badge" [title]="'common.noData' | translate" />
    } @else {
      <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (member of staff(); track member.id) {
          <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
            <app-avatar [fullName]="member.fullName" [photoUrl]="member.avatarUrl" [size]="46" />
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ member.fullName }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">{{ member.phone }}</div>
              <div class="mt-1.5 flex flex-wrap gap-1">
                <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{{ roleLabel(member.role) | translate }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  [class.bg-success]="member.status === 'ACTIVE'"
                  [class.text-white]="member.status === 'ACTIVE'"
                  [class.bg-warning]="member.status !== 'ACTIVE'"
                >
                  {{ statusLabel(member.status) | translate }}
                </span>
              </div>
              @if (member.groupTeacherLinks?.length) {
                <div class="mt-1.5 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <mat-icon class="!h-3.5 !w-3.5 !text-sm">groups</mat-icon>
                  {{ groupNames(member) }}
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class OwnerStaffComponent implements OnInit {
  private readonly staffApi = inject(StaffApi);
  private readonly groupsApi = inject(GroupsApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly staff = signal<StaffMember[]>([]);
  private groups: Group[] = [];

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    forkJoin([this.staffApi.list(), this.groupsApi.list()]).subscribe({
      next: ([staff, groups]) => {
        this.staff.set(staff);
        this.groups = groups;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  roleLabel(role: string): string {
    return ROLE_LABEL_KEYS[role] ?? role;
  }

  statusLabel(status: string): string {
    return STATUS_LABEL_KEYS[status] ?? status;
  }

  activeCount(): number {
    return this.staff().filter((m) => m.status === 'ACTIVE').length;
  }

  teacherCount(): number {
    return this.staff().filter((m) => m.role === 'TEACHER').length;
  }

  groupNames(member: StaffMember): string {
    return (member.groupTeacherLinks ?? []).map((l) => l.group.name).join(', ');
  }

  openInvite(): void {
    const ref = this.dialog.open(StaffInviteDialogComponent, { width: '420px', data: { groups: this.groups } });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.staffApi.invite(result).subscribe({
        next: (created) => {
          this.refresh();
          this.dialog.open(StaffTempPasswordDialogComponent, { width: '360px', data: { password: created.tempPassword } });
        },
        error: () => this.toast.error('common.error'),
      });
    });
  }
}
