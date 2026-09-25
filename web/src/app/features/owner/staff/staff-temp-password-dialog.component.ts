import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-staff-temp-password-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon class="text-success">check_circle</mat-icon>
      {{ 'staff.tempPasswordTitle' | translate }}
    </h2>
    <mat-dialog-content>
      <p class="text-sm text-[var(--color-text-muted)]">{{ 'staff.tempPasswordDesc' | translate }}</p>
      <div class="mt-2 rounded-md bg-[var(--color-bg)] p-3 text-center font-mono text-lg tracking-widest">
        {{ password }}
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="dialogRef.close()">{{ 'common.close' | translate }}</button>
    </mat-dialog-actions>
  `,
})
export class StaffTempPasswordDialogComponent {
  readonly dialogRef = inject(MatDialogRef<StaffTempPasswordDialogComponent>);
  readonly password = inject<{ password: string }>(MAT_DIALOG_DATA).password;
}
