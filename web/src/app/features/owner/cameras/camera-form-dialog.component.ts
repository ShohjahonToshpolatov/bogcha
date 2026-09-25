import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { Branch, Camera, Group } from '../../../core/api/models';

const DAYS: { key: string; labelKey: string }[] = [
  { key: 'mon', labelKey: 'days.mon' },
  { key: 'tue', labelKey: 'days.tue' },
  { key: 'wed', labelKey: 'days.wed' },
  { key: 'thu', labelKey: 'days.thu' },
  { key: 'fri', labelKey: 'days.fri' },
  { key: 'sat', labelKey: 'days.sat' },
  { key: 'sun', labelKey: 'days.sun' },
];

export interface CameraFormDialogData {
  branches: Branch[];
  groups: Group[];
  camera?: Camera;
}

@Component({
  selector: 'app-camera-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatButtonModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.camera ? 'cameras.editCamera' : 'cameras.addCamera') | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-3">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'cameras.name' | translate }}</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'cameras.rtspUrl' | translate }}</mat-label>
          <input matInput formControlName="rtspUrl" placeholder="rtsp://user:pass@192.168.1.10:554/stream1" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'children.branch' | translate }}</mat-label>
          <mat-select formControlName="branchId">
            @for (branch of data.branches; track branch.id) {
              <mat-option [value]="branch.id">{{ branch.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'children.group' | translate }}</mat-label>
          <mat-select formControlName="groupId">
            <mat-option [value]="null">{{ 'cameras.commonArea' | translate }}</mat-option>
            @for (group of data.groups; track group.id) {
              <mat-option [value]="group.id">{{ group.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3">
          <span class="text-sm">{{ 'cameras.visibleToParents' | translate }}</span>
          <mat-slide-toggle formControlName="visibleToParents" />
        </div>

        <div>
          <div class="mb-2 text-sm font-medium">{{ 'cameras.schedule' | translate }}</div>
          <div class="flex flex-wrap gap-2">
            @for (day of days; track day.key) {
              <mat-checkbox [checked]="selectedDays.has(day.key)" (change)="toggleDay(day.key)">
                {{ day.labelKey | translate }}
              </mat-checkbox>
            }
          </div>
          <div class="mt-2 grid grid-cols-2 gap-3">
            <mat-form-field appearance="outline" class="!m-0">
              <mat-label>{{ 'cameras.openTime' | translate }}</mat-label>
              <input matInput type="time" formControlName="openTime" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="!m-0">
              <mat-label>{{ 'cameras.closeTime' | translate }}</mat-label>
              <input matInput type="time" formControlName="closeTime" />
            </mat-form-field>
          </div>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'cameras.maxViewMinutes' | translate }}</mat-label>
          <input matInput type="number" formControlName="maxViewMinutes" />
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ 'common.save' | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class CameraFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<CameraFormDialogComponent>);
  readonly data = inject<CameraFormDialogData>(MAT_DIALOG_DATA);
  readonly days = DAYS;

  readonly selectedDays = new Set<string>(
    this.data.camera?.schedule ? Object.keys(this.data.camera.schedule) : ['mon', 'tue', 'wed', 'thu', 'fri'],
  );

  readonly form = this.fb.nonNullable.group({
    name: [this.data.camera?.name ?? '', Validators.required],
    rtspUrl: ['', this.data.camera ? [] : [Validators.required]],
    branchId: [this.data.camera?.branchId ?? this.data.branches[0]?.id ?? '', Validators.required],
    groupId: [this.data.camera?.groupId ?? null],
    visibleToParents: [this.data.camera?.visibleToParents ?? false],
    openTime: [this.data.camera?.schedule?.['mon']?.[0]?.[0] ?? '09:00'],
    closeTime: [this.data.camera?.schedule?.['mon']?.[0]?.[1] ?? '18:00'],
    maxViewMinutes: [this.data.camera?.maxViewMinutes ?? 15, Validators.required],
  });

  toggleDay(key: string): void {
    if (this.selectedDays.has(key)) this.selectedDays.delete(key);
    else this.selectedDays.add(key);
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const schedule: Record<string, [string, string][]> = {};
    this.selectedDays.forEach((day) => {
      schedule[day] = [[raw.openTime, raw.closeTime]];
    });

    this.dialogRef.close({
      name: raw.name,
      rtspUrl: raw.rtspUrl || undefined,
      branchId: raw.branchId,
      groupId: raw.groupId ?? undefined,
      visibleToParents: raw.visibleToParents,
      schedule,
      maxViewMinutes: raw.maxViewMinutes,
    });
  }
}
