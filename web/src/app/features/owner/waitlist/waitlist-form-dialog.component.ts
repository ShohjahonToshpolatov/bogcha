import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

const UZ_PHONE_PATTERN = /^\+998\d{9}$/;

@Component({
  selector: 'app-waitlist-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'waitlist.addApplication' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-3">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'waitlist.childName' | translate }}</mat-label>
          <input matInput formControlName="childName" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'children.birthDate' | translate }}</mat-label>
          <input matInput type="date" formControlName="birthDate" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'waitlist.parentName' | translate }}</mat-label>
          <input matInput formControlName="parentName" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'auth.phone' | translate }}</mat-label>
          <input matInput formControlName="parentPhone" placeholder="+998901234567" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'waitlist.desiredStart' | translate }}</mat-label>
          <input matInput type="date" formControlName="desiredStart" />
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
export class WaitlistFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<WaitlistFormDialogComponent>);

  readonly form = this.fb.nonNullable.group({
    childName: ['', Validators.required],
    birthDate: ['', Validators.required],
    parentName: ['', Validators.required],
    parentPhone: ['', [Validators.required, Validators.pattern(UZ_PHONE_PATTERN)]],
    desiredStart: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
