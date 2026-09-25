import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { Dish } from '../../../core/api/models';

export interface MenuDayDialogData {
  dishes: Dish[];
  dateLabel: string;
  mealLabel: string;
}

@Component({
  selector: 'app-menu-day-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.mealLabel }} · {{ data.dateLabel }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-2">
        @for (dish of dishes.controls; track $index) {
          <div class="flex items-center gap-2">
            <mat-form-field appearance="outline" class="!m-0 flex-1">
              <input matInput [formControl]="dish" [placeholder]="'menu.dishName' | translate" />
            </mat-form-field>
            <button mat-icon-button type="button" (click)="dishes.removeAt($index)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
        <button mat-button type="button" (click)="addDish()">
          <mat-icon>add</mat-icon>
          {{ 'menu.addDish' | translate }}
        </button>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button color="primary" type="submit">{{ 'common.save' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class MenuDayDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<MenuDayDialogComponent, Dish[]>);
  readonly data = inject<MenuDayDialogData>(MAT_DIALOG_DATA);

  readonly dishes: FormArray<FormControl<string>> = this.fb.array(
    this.data.dishes.length ? this.data.dishes.map((d) => this.fb.nonNullable.control(d.name, Validators.required)) : [],
  );

  readonly form = this.fb.group({ dishes: this.dishes });

  addDish(): void {
    this.dishes.push(this.fb.nonNullable.control('', Validators.required));
  }

  submit(): void {
    const names = (this.dishes.value as string[]).filter((n) => n && n.trim());
    this.dialogRef.close(names.map((name) => ({ name })));
  }
}
