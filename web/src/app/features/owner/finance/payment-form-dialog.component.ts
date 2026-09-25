import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Child, PaymentMethod } from '../../../core/api/models';

export interface PaymentFormDialogData {
  children: Child[];
}

@Component({
  selector: 'app-payment-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'finance.recordPayment' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-3">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'children.title' | translate }}</mat-label>
          <mat-select formControlName="childId">
            @for (child of data.children; track child.id) {
              <mat-option [value]="child.id">{{ child.firstName }} {{ child.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'finance.amount' | translate }}</mat-label>
          <input matInput type="number" formControlName="amount" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'finance.method' | translate }}</mat-label>
          <mat-select formControlName="method">
            <mat-option value="CASH">{{ 'finance.methodCash' | translate }}</mat-option>
            <mat-option value="CARD">{{ 'finance.methodCard' | translate }}</mat-option>
            <mat-option value="TRANSFER">{{ 'finance.methodTransfer' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">{{ 'common.save' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class PaymentFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<PaymentFormDialogComponent>);
  readonly data = inject<PaymentFormDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    childId: ['', Validators.required],
    amount: ['', Validators.required],
    method: ['CASH' as PaymentMethod, Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
