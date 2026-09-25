import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Group } from '../../../core/api/models';

export interface AnnouncementFormDialogData {
  groups: Group[];
}

@Component({
  selector: 'app-announcement-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'announcements.create' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-3">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'announcements.titleField' | translate }}</mat-label>
          <input matInput formControlName="title" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'announcements.body' | translate }}</mat-label>
          <textarea matInput rows="4" formControlName="body"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'announcements.targetGroup' | translate }}</mat-label>
          <mat-select formControlName="groupId">
            <mat-option [value]="null">{{ 'announcements.allGroups' | translate }}</mat-option>
            @for (group of data.groups; track group.id) {
              <mat-option [value]="group.id">{{ group.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-checkbox formControlName="isPinned">{{ 'announcements.pin' | translate }}</mat-checkbox>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ 'announcements.create' | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class AnnouncementFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<AnnouncementFormDialogComponent>);
  readonly data = inject<AnnouncementFormDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    body: ['', Validators.required],
    groupId: [null as string | null],
    isPinned: [false],
  });

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.dialogRef.close({ ...raw, groupId: raw.groupId ?? undefined });
  }
}
