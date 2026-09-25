import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-tariff-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'finance.addTariff' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-3">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'finance.tariffName' | translate }}</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'finance.monthlyAmount' | translate }}</mat-label>
          <input matInput type="number" formControlName="monthlyAmount" />
        </mat-form-field>
        <mat-checkbox formControlName="includesMeals">{{ 'parent.meals' | translate }}</mat-checkbox>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">{{ 'common.save' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class TariffFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<TariffFormDialogComponent>);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    monthlyAmount: ['', Validators.required],
    includesMeals: [true],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
