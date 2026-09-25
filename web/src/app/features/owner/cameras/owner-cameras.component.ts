import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { BranchesApi } from '../../../core/api/branches.api';
import { CamerasApi } from '../../../core/api/cameras.api';
import { GroupsApi } from '../../../core/api/groups.api';
import { Branch, Camera, Group } from '../../../core/api/models';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { CameraFormDialogComponent } from './camera-form-dialog.component';

@Component({
  selector: 'app-owner-cameras',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, EmptyStateComponent, StatCardComponent],
  template: `
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">{{ 'cameras.title' | translate }}</h1>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon>
        {{ 'cameras.addCamera' | translate }}
      </button>
    </div>

    <div class="mt-2 flex items-start gap-2 rounded-xl bg-accent/10 p-3 text-sm text-[#8a5a00]">
      <mat-icon class="!h-5 !w-5 !text-xl text-accent">info</mat-icon>
      <span>{{ 'cameras.legalNotice' | translate }}</span>
    </div>

    @if (!loading() && cameras().length > 0) {
      <div class="mt-4 grid grid-cols-3 gap-3">
        <app-stat-card icon="videocam" [value]="cameras().length" [label]="'cameras.title' | translate" color="primary" />
        <app-stat-card icon="wifi" [value]="onlineCount()" [label]="'common.online' | translate" color="success" />
        <app-stat-card icon="visibility" [value]="visibleCount()" [label]="'cameras.visibleToParents' | translate" color="accent" />
      </div>
    }

    @if (loading()) {
      <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
    } @else if (cameras().length === 0) {
      <app-empty-state icon="videocam" [title]="'common.noData' | translate" />
    } @else {
      <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (camera of cameras(); track camera.id) {
          <div class="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div class="flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 py-6">
              <mat-icon class="!h-9 !w-9 !text-4xl text-white/90">videocam</mat-icon>
            </div>
            <div class="p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span
                    class="h-2 w-2 rounded-full"
                    [class.bg-success]="camera.status === 'ONLINE'"
                    [class.bg-danger]="camera.status !== 'ONLINE'"
                  ></span>
                  <span class="font-semibold">{{ camera.name }}</span>
                </div>
                <button mat-icon-button (click)="remove(camera)">
                  <mat-icon class="!text-lg text-[var(--color-text-muted)]">delete</mat-icon>
                </button>
              </div>
              <div class="mt-1 text-sm text-[var(--color-text-muted)]">
                {{ camera.group?.name ?? ('cameras.commonArea' | translate) }} · {{ camera.branch?.name }}
              </div>
              <div class="mt-2 flex items-center gap-1.5 text-xs">
                @if (camera.visibleToParents) {
                  <span class="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">{{ 'cameras.visibleToParents' | translate }}</span>
                } @else {
                  <span class="rounded-full bg-[var(--color-bg)] px-2 py-0.5 font-medium text-[var(--color-text-muted)]">{{ 'cameras.hidden' | translate }}</span>
                }
                <span class="text-[var(--color-text-muted)]">{{ camera.maxViewMinutes }} {{ 'cameras.minutesShort' | translate }}</span>
              </div>
              <div class="mt-3 flex gap-2">
                <button mat-stroked-button class="!flex-1" (click)="openForm(camera)">{{ 'common.edit' | translate }}</button>
                <button mat-stroked-button class="!flex-1" (click)="test(camera)">{{ 'cameras.test' | translate }}</button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class OwnerCamerasComponent implements OnInit {
  private readonly camerasApi = inject(CamerasApi);
  private readonly groupsApi = inject(GroupsApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly cameras = signal<Camera[]>([]);
  private branches: Branch[] = [];
  private groups: Group[] = [];

  onlineCount(): number {
    return this.cameras().filter((c) => c.status === 'ONLINE').length;
  }

  visibleCount(): number {
    return this.cameras().filter((c) => c.visibleToParents).length;
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    forkJoin([this.camerasApi.list(), this.groupsApi.list(), this.branchesApi.list()]).subscribe({
      next: ([cameras, groups, branches]) => {
        this.cameras.set(cameras);
        this.groups = groups;
        this.branches = branches;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(camera?: Camera): void {
    const ref = this.dialog.open(CameraFormDialogComponent, {
      width: '480px',
      maxHeight: '90vh',
      data: { branches: this.branches, groups: this.groups, camera },
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      const action$ = camera ? this.camerasApi.update(camera.id, result) : this.camerasApi.create(result);
      action$.subscribe({
        next: () => {
          this.toast.success('common.success');
          this.refresh();
        },
        error: () => this.toast.error('common.error'),
      });
    });
  }

  test(camera: Camera): void {
    this.camerasApi.test(camera.id).subscribe({
      next: (res) => this.toast[res.reachable ? 'success' : 'error']('cameras.test'),
      error: () => this.toast.error('common.error'),
    });
  }

  remove(camera: Camera): void {
    const title = this.translate.instant('common.delete');
    this.confirm.ask({ title, message: camera.name, danger: true }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.camerasApi.remove(camera.id).subscribe({
        next: () => {
          this.toast.success('common.success');
          this.refresh();
        },
        error: () => this.toast.error('common.error'),
      });
    });
  }
}
