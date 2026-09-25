import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Branch, Group } from '../../../core/api/models';

const PRESET_COLORS = ['#4F8EF7', '#FFB020', '#2FB574', '#E5484D', '#9B5DE5', '#00BBF9'];

export interface GroupFormDialogData {
  branches: Branch[];
  group?: Group;
}

@Component({
  selector: 'app-group-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ (data.group ? 'groups.editGroup' : 'groups.addGroup') | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-3">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'groups.name' | translate }}</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'children.branch' | translate }}</mat-label>
          <mat-select formControlName="branchId">
            @for (branch of data.branches; track branch.id) {
              <mat-option [value]="branch.id">{{ branch.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="grid grid-cols-2 gap-3">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'groups.ageMin' | translate }}</mat-label>
            <input matInput type="number" formControlName="ageMin" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'groups.ageMax' | translate }}</mat-label>
            <input matInput type="number" formControlName="ageMax" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'groups.capacity' | translate }}</mat-label>
          <input matInput type="number" formControlName="capacity" />
        </mat-form-field>

        <div>
          <div class="mb-1 text-sm text-[var(--color-text-muted)]">{{ 'groups.color' | translate }}</div>
          <div class="flex gap-2">
            @for (color of presetColors; track color) {
              <button
                type="button"
                class="h-8 w-8 rounded-full border-2"
                [style.background]="color"
                [style.border-color]="form.value.colorHex === color ? 'var(--color-text)' : 'transparent'"
                (click)="form.patchValue({ colorHex: color })"
              ></button>
            }
          </div>
        </div>
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
export class GroupFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<GroupFormDialogComponent, ReturnType<GroupFormDialogComponent['form']['getRawValue']>>);
  readonly data = inject<GroupFormDialogData>(MAT_DIALOG_DATA);
  readonly presetColors = PRESET_COLORS;

  readonly form = this.fb.nonNullable.group({
    name: [this.data.group?.name ?? '', Validators.required],
    branchId: [this.data.group?.branchId ?? this.data.branches[0]?.id ?? '', Validators.required],
    ageMin: [this.data.group?.ageMin ?? 24, Validators.required],
    ageMax: [this.data.group?.ageMax ?? 36, Validators.required],
    capacity: [this.data.group?.capacity ?? 20, Validators.required],
    colorHex: [this.data.group?.colorHex ?? PRESET_COLORS[0]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
