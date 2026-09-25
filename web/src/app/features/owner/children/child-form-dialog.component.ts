import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Branch, Gender, Group } from '../../../core/api/models';

const UZ_PHONE_PATTERN = /^\+998\d{9}$/;

export interface ChildFormDialogData {
  branches: Branch[];
  groups: Group[];
}

@Component({
  selector: 'app-child-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'children.addChild' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-3">
        <div class="grid grid-cols-2 gap-3">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'children.firstName' | translate }}</mat-label>
            <input matInput formControlName="firstName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'children.lastName' | translate }}</mat-label>
            <input matInput formControlName="lastName" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'children.birthDate' | translate }}</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="birthDate" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>

        <mat-radio-group formControlName="gender" class="flex gap-4">
          <mat-radio-button value="MALE">{{ 'children.male' | translate }}</mat-radio-button>
          <mat-radio-button value="FEMALE">{{ 'children.female' | translate }}</mat-radio-button>
        </mat-radio-group>

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
            <mat-option [value]="null">{{ 'children.noGroup' | translate }}</mat-option>
            @for (group of data.groups; track group.id) {
              <mat-option [value]="group.id">{{ group.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'children.address' | translate }}</mat-label>
          <input matInput formControlName="address" />
        </mat-form-field>

        <div class="mt-2 flex items-center justify-between">
          <span class="text-sm font-medium">{{ 'children.guardians' | translate }}</span>
          <button mat-button type="button" (click)="addGuardian()">
            <mat-icon>add</mat-icon>
            {{ 'children.addGuardian' | translate }}
          </button>
        </div>

        @for (guardian of guardians.controls; track $index) {
          <div [formGroup]="guardian" class="grid grid-cols-[1fr_1fr_auto_auto] items-start gap-2 rounded-md border border-[var(--color-border)] p-2">
            <mat-form-field appearance="outline" class="!m-0">
              <mat-label>{{ 'children.guardianName' | translate }}</mat-label>
              <input matInput formControlName="fullName" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="!m-0">
              <mat-label>{{ 'children.guardianPhone' | translate }}</mat-label>
              <input matInput formControlName="phone" placeholder="+998901234567" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="!m-0 w-24">
              <mat-label>{{ 'children.guardianRelation' | translate }}</mat-label>
              <input matInput formControlName="relation" placeholder="Ona" />
            </mat-form-field>
            <button mat-icon-button type="button" (click)="removeGuardian($index)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
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
export class ChildFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<ChildFormDialogComponent>);
  readonly data = inject<ChildFormDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    birthDate: [null as Date | null, Validators.required],
    gender: ['MALE' as Gender, Validators.required],
    branchId: [this.data.branches[0]?.id ?? '', Validators.required],
    groupId: [null as string | null],
    address: [''],
    guardians: this.fb.array<ReturnType<typeof this.createGuardianGroup>>([]),
  });

  get guardians() {
    return this.form.controls.guardians;
  }

  private createGuardianGroup() {
    return this.fb.nonNullable.group({
      fullName: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(UZ_PHONE_PATTERN)]],
      relation: ['', Validators.required],
    });
  }

  addGuardian(): void {
    this.guardians.push(this.createGuardianGroup());
  }

  removeGuardian(index: number): void {
    this.guardians.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      ...raw,
      birthDate: raw.birthDate ? new Date(raw.birthDate).toISOString().slice(0, 10) : undefined,
      groupId: raw.groupId ?? undefined,
    });
  }
}
