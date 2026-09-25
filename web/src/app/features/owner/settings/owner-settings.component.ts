import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { TenantsApi } from '../../../core/api/tenants.api';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-owner-settings',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, TranslatePipe],
  template: `
    <h1 class="text-xl font-semibold">{{ 'settings.title' | translate }}</h1>

    <div class="mt-4 max-w-xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div class="flex items-center gap-3 bg-gradient-to-br from-primary to-primary-dark p-5 text-white">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <mat-icon class="!h-7 !w-7 !text-3xl">child_care</mat-icon>
        </div>
        <div>
          <div class="text-lg font-semibold">{{ form.value.name || "Bog'cham" }}</div>
          <div class="text-xs opacity-90">{{ 'settings.title' | translate }}</div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3 p-5">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'settings.tenantName' | translate }}</mat-label>
          <mat-icon matPrefix class="mr-2 !text-lg text-[var(--color-text-muted)]">store</mat-icon>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'settings.tenantPhone' | translate }}</mat-label>
          <mat-icon matPrefix class="mr-2 !text-lg text-[var(--color-text-muted)]">call</mat-icon>
          <input matInput formControlName="phone" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'settings.tenantEmail' | translate }}</mat-label>
          <mat-icon matPrefix class="mr-2 !text-lg text-[var(--color-text-muted)]">mail</mat-icon>
          <input matInput formControlName="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'settings.tenantAddress' | translate }}</mat-label>
          <mat-icon matPrefix class="mr-2 !text-lg text-[var(--color-text-muted)]">location_on</mat-icon>
          <input matInput formControlName="address" />
        </mat-form-field>
        <button mat-flat-button color="primary" type="submit" class="!h-12">
          <mat-icon>save</mat-icon>
          {{ 'common.save' | translate }}
        </button>
      </form>
    </div>
  `,
})
export class OwnerSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TenantsApi);
  private readonly toast = inject(ToastService);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    phone: [''],
    email: [''],
    address: [''],
  });

  ngOnInit(): void {
    this.api.current().subscribe((tenant) => {
      this.form.patchValue({
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email ?? '',
        address: tenant.address ?? '',
      });
    });
  }

  submit(): void {
    this.api.update(this.form.getRawValue()).subscribe({
      next: () => this.toast.success('settings.saved'),
      error: () => this.toast.error('common.error'),
    });
  }
}
