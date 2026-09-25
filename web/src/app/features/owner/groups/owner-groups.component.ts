import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { BranchesApi } from '../../../core/api/branches.api';
import { GroupsApi } from '../../../core/api/groups.api';
import { Branch, Group } from '../../../core/api/models';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { GroupFormDialogComponent } from './group-form-dialog.component';

@Component({
  selector: 'app-owner-groups',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, EmptyStateComponent, StatCardComponent],
  template: `
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">{{ 'groups.title' | translate }}</h1>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon>
        {{ 'groups.addGroup' | translate }}
      </button>
    </div>

    @if (!loading() && groups().length > 0) {
      <div class="mt-4 grid grid-cols-3 gap-3">
        <app-stat-card icon="groups" [value]="groups().length" [label]="'groups.title' | translate" color="primary" />
        <app-stat-card icon="child_care" [value]="totalEnrolled()" [label]="'children.title' | translate" color="success" />
        <app-stat-card icon="pie_chart" [value]="avgOccupancy() + '%'" [label]="'reports.occupancy' | translate" color="accent" />
      </div>
    }

    @if (loading()) {
      <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
    } @else if (groups().length === 0) {
      <app-empty-state icon="groups" [title]="'common.noData' | translate" />
    } @else {
      <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (group of groups(); track group.id) {
          <div
            class="cursor-pointer overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md"
            (click)="openForm(group)"
          >
            <div class="h-2" [style.background]="group.colorHex"></div>
            <div class="p-4">
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{ group.name }}</span>
                <span class="text-xs text-[var(--color-text-muted)]">{{ group.ageMin }}–{{ group.ageMax }} oy</span>
              </div>

              <div class="mt-3">
                <div class="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>{{ 'groups.childrenCount' | translate: { count: group._count?.children ?? 0 } }}</span>
                  <span>{{ group._count?.children ?? 0 }} / {{ group.capacity }}</span>
                </div>
                <div class="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-bg)]">
                  <div
                    class="h-full rounded-full"
                    [style.width.%]="occupancyPct(group)"
                    [style.background]="group.colorHex"
                  ></div>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--color-border)] pt-3">
                @if (group.teachers?.length) {
                  @for (t of group.teachers; track t.id) {
                    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{{ t.user.fullName }}</span>
                  }
                } @else {
                  <span class="text-xs text-[var(--color-text-muted)]">{{ 'groups.noTeacher' | translate }}</span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class OwnerGroupsComponent implements OnInit {
  private readonly groupsApi = inject(GroupsApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly groups = signal<Group[]>([]);
  private branches: Branch[] = [];

  occupancyPct(group: Group): number {
    if (!group.capacity) return 0;
    return Math.min(100, Math.round(((group._count?.children ?? 0) / group.capacity) * 100));
  }

  totalEnrolled(): number {
    return this.groups().reduce((sum, g) => sum + (g._count?.children ?? 0), 0);
  }

  avgOccupancy(): number {
    const groups = this.groups();
    if (groups.length === 0) return 0;
    const total = groups.reduce((sum, g) => sum + this.occupancyPct(g), 0);
    return Math.round(total / groups.length);
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    forkJoin([this.groupsApi.list(), this.branchesApi.list()]).subscribe({
      next: ([groups, branches]) => {
        this.groups.set(groups);
        this.branches = branches;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(group?: Group): void {
    const ref = this.dialog.open(GroupFormDialogComponent, {
      width: '420px',
      data: { branches: this.branches, group },
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      const action$ = group ? this.groupsApi.update(group.id, result) : this.groupsApi.create(result);
      action$.subscribe({
        next: () => {
          this.toast.success('common.success');
          this.refresh();
        },
        error: () => this.toast.error('common.error'),
      });
    });
  }
}
