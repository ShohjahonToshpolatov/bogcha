import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { BranchesApi } from '../../../core/api/branches.api';
import { ChildrenApi } from '../../../core/api/children.api';
import { GroupsApi } from '../../../core/api/groups.api';
import { Branch, Child, Group } from '../../../core/api/models';
import { ToastService } from '../../../core/services/toast.service';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { UzDatePipe } from '../../../shared/pipes/uz-date.pipe';
import { ChildFormDialogComponent } from './child-form-dialog.component';

@Component({
  selector: 'app-owner-children',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    AvatarComponent,
    EmptyStateComponent,
    StatCardComponent,
    UzDatePipe,
  ],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold">{{ 'children.title' | translate }}</h1>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon>
        {{ 'children.addChild' | translate }}
      </button>
    </div>

    @if (!loading()) {
      <div class="mt-4 grid grid-cols-3 gap-3">
        <app-stat-card icon="child_care" [value]="children().length" [label]="'children.title' | translate" color="primary" />
        <app-stat-card icon="groups" [value]="withGroupCount()" [label]="'children.group' | translate" color="success" />
        <app-stat-card icon="warning" [value]="allergyCount()" [label]="'children.allergyWarning' | translate" color="danger" />
      </div>
    }

    <mat-form-field appearance="outline" class="mt-4 w-full max-w-sm">
      <mat-icon matPrefix class="mr-2 text-[var(--color-text-muted)]">search</mat-icon>
      <input matInput [formControl]="searchControl" [placeholder]="'children.searchPlaceholder' | translate" />
    </mat-form-field>

    @if (loading()) {
      <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
    } @else if (children().length === 0) {
      <app-empty-state icon="child_care" [title]="'children.noChildren' | translate" />
    } @else {
      <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (child of children(); track child.id) {
          <div class="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div class="h-1.5" [style.background]="child.group?.colorHex ?? 'var(--color-border)'"></div>
            <div class="p-4">
              <div class="flex items-center gap-3">
                <app-avatar [fullName]="child.firstName + ' ' + child.lastName" [photoUrl]="child.photoUrl" [size]="48" />
                <div class="min-w-0 flex-1">
                  <div class="truncate font-semibold">{{ child.firstName }} {{ child.lastName }}</div>
                  <div class="text-xs text-[var(--color-text-muted)]">{{ child.birthDate | uzDate }}</div>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-1.5">
                @if (child.group) {
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium text-white" [style.background]="child.group.colorHex">
                    {{ child.group.name }}
                  </span>
                } @else {
                  <span class="rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                    {{ 'children.noGroup' | translate }}
                  </span>
                }
                @if (child.allergies?.length) {
                  <span class="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                    ⚠️ {{ child.allergies?.[0]?.title }}
                  </span>
                }
              </div>

              @if (child.guardians?.length) {
                <div class="mt-3 flex items-center gap-2 border-t border-[var(--color-border)] pt-3 text-sm">
                  <mat-icon class="!h-4 !w-4 !text-base text-[var(--color-text-muted)]">person</mat-icon>
                  <span class="truncate">{{ child.guardians?.[0]?.user?.fullName }}</span>
                  <a [href]="'tel:' + child.guardians?.[0]?.user?.phone" class="ml-auto text-primary">
                    <mat-icon class="!h-4 !w-4 !text-base">call</mat-icon>
                  </a>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class OwnerChildrenComponent implements OnInit {
  private readonly childrenApi = inject(ChildrenApi);
  private readonly groupsApi = inject(GroupsApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly children = signal<Child[]>([]);
  readonly searchControl = new FormControl('');

  private branches: Branch[] = [];
  private groups: Group[] = [];

  withGroupCount(): number {
    return this.children().filter((c) => c.group).length;
  }

  allergyCount(): number {
    return this.children().filter((c) => c.allergies?.length).length;
  }

  ngOnInit(): void {
    this.refresh();
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.refresh(value ?? '');
    });
  }

  refresh(search = ''): void {
    this.loading.set(true);
    forkJoin([this.childrenApi.list({ search }), this.groupsApi.list(), this.branchesApi.list()]).subscribe({
      next: ([result, groups, branches]) => {
        this.children.set(result.items);
        this.groups = groups;
        this.branches = branches;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    const ref = this.dialog.open(ChildFormDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      data: { branches: this.branches, groups: this.groups },
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.childrenApi.create(result).subscribe({
        next: () => {
          this.toast.success('common.success');
          this.refresh();
        },
        error: () => this.toast.error('common.error'),
      });
    });
  }
}
