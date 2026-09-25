import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Group } from '../../../core/api/models';

const UZ_PHONE_PATTERN = /^\+998\d{9}$/;

export interface StaffInviteDialogData {
  groups: Group[];
}

@Component({
  selector: 'app-staff-invite-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'staff.inviteStaff' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-3">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'common.name' | translate }}</mat-label>
          <input matInput formControlName="fullName" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'auth.phone' | translate }}</mat-label>
          <input matInput formControlName="phone" placeholder="+998901234567" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'staff.role' | translate }}</mat-label>
          <mat-select formControlName="role">
            <mat-option value="TEACHER">{{ 'staff.roleTeacher' | translate }}</mat-option>
            <mat-option value="ADMIN">{{ 'staff.roleAdmin' | translate }}</mat-option>
            <mat-option value="NURSE">{{ 'staff.roleNurse' | translate }}</mat-option>
            <mat-option value="COOK">{{ 'staff.roleCook' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'staff.position' | translate }}</mat-label>
          <input matInput formControlName="position" />
        </mat-form-field>
        @if (form.value.role === 'TEACHER') {
          <mat-form-field appearance="outline">
            <mat-label>{{ 'nav.groups' | translate }}</mat-label>
            <mat-select formControlName="groupIds" multiple>
              @for (group of data.groups; track group.id) {
                <mat-option [value]="group.id">{{ group.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
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
export class StaffInviteDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<StaffInviteDialogComponent>);
  readonly data = inject<StaffInviteDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(UZ_PHONE_PATTERN)]],
    role: ['TEACHER', Validators.required],
    position: [''],
    groupIds: [[] as string[]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
