import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { AttendanceApi } from '../../../core/api/attendance.api';
import { GroupsApi } from '../../../core/api/groups.api';
import { AttendanceStatus, DailyAttendanceEntry, Group } from '../../../core/api/models';
import { ToastService } from '../../../core/services/toast.service';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-owner-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    AvatarComponent,
    EmptyStateComponent,
    StatCardComponent,
  ],
  template: `
    <h1 class="text-xl font-semibold">{{ 'nav.attendance' | translate }}</h1>

    <div class="mt-3 flex flex-wrap gap-3">
      <mat-form-field appearance="outline" class="w-56">
        <mat-label>{{ 'attendance.selectGroup' | translate }}</mat-label>
        <mat-select [(ngModel)]="selectedGroupId" (selectionChange)="refresh()">
          @for (group of groups(); track group.id) {
            <mat-option [value]="group.id">{{ group.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-48">
        <mat-label>{{ 'attendance.selectDate' | translate }}</mat-label>
        <input matInput type="date" [(ngModel)]="selectedDate" (change)="refresh()" />
      </mat-form-field>
    </div>

    @if (!loading() && selectedGroupId && entries().length > 0) {
      <div class="mt-1 grid grid-cols-3 gap-3">
        <app-stat-card icon="check_circle" [value]="countByStatus('PRESENT')" [label]="'attendance.present' | translate" color="success" />
        <app-stat-card icon="cancel" [value]="countByStatus('ABSENT')" [label]="'attendance.absent' | translate" color="danger" />
        <app-stat-card icon="sick" [value]="countByStatus('SICK')" [label]="'attendance.sick' | translate" color="accent" />
      </div>
    }

    @if (loading()) {
      <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
    } @else if (!selectedGroupId) {
      <app-empty-state icon="fact_check" [title]="'attendance.selectGroup' | translate" />
    } @else if (entries().length === 0) {
      <app-empty-state icon="child_care" [title]="'children.noChildren' | translate" />
    } @else {
      <div class="mt-4 flex flex-col gap-2.5">
        @for (entry of entries(); track entry.child.id) {
          <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-sm">
            <app-avatar [fullName]="entry.child.firstName + ' ' + entry.child.lastName" [photoUrl]="entry.child.photoUrl" [size]="42" />
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ entry.child.firstName }} {{ entry.child.lastName }}</div>
              @if (entry.child.allergies?.length) {
                <div class="text-xs text-danger">⚠️ {{ 'children.allergyWarning' | translate }}</div>
              }
            </div>
            <mat-button-toggle-group [value]="entry.attendance?.status" (change)="setStatus(entry, $event.value)">
              <mat-button-toggle value="PRESENT">{{ 'attendance.present' | translate }}</mat-button-toggle>
              <mat-button-toggle value="ABSENT">{{ 'attendance.absent' | translate }}</mat-button-toggle>
              <mat-button-toggle value="SICK">{{ 'attendance.sick' | translate }}</mat-button-toggle>
            </mat-button-toggle-group>
          </div>
        }
      </div>
    }
  `,
})
export class OwnerAttendanceComponent implements OnInit {
  private readonly attendanceApi = inject(AttendanceApi);
  private readonly groupsApi = inject(GroupsApi);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly groups = signal<Group[]>([]);
  readonly entries = signal<DailyAttendanceEntry[]>([]);
  selectedGroupId = '';
  selectedDate = today();

  countByStatus(status: string): number {
    return this.entries().filter((e) => e.attendance?.status === status).length;
  }

  ngOnInit(): void {
    this.groupsApi.list().subscribe((groups) => {
      this.groups.set(groups);
      this.selectedGroupId = groups[0]?.id ?? '';
      this.refresh();
    });
  }

  refresh(): void {
    if (!this.selectedGroupId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.attendanceApi.daily(this.selectedGroupId, this.selectedDate).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setStatus(entry: DailyAttendanceEntry, status: AttendanceStatus): void {
    if (!status) return;
    this.attendanceApi.mark(entry.child.id, this.selectedDate, status).subscribe({
      next: () => {
        this.toast.success('common.success');
        this.refresh();
      },
      error: () => this.toast.error('common.error'),
    });
  }
}
