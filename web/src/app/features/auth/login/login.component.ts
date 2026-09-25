import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

const UZ_PHONE_PATTERN = /^\+998\d{9}$/;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    TranslatePipe,
  ],
  template: `
    <div class="bogcha-bg flex min-h-dvh w-full items-center justify-center p-6">
    <div class="mx-auto flex w-full max-w-[420px] flex-col justify-center gap-6">
      <div class="flex flex-col items-center gap-3">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
          <mat-icon class="!h-9 !w-9 !text-4xl text-white">child_care</mat-icon>
        </div>
        <h1 class="text-2xl font-semibold">Bog'cham</h1>
        <p class="text-sm text-[var(--color-text-muted)]">{{ 'auth.welcomeBack' | translate }}</p>
      </div>

      <mat-tab-group [(selectedIndex)]="selectedTab" mat-align-tabs="center">
        <mat-tab [label]="'auth.loginWithPassword' | translate">
          <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()" class="flex flex-col gap-3 pt-4">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'auth.phone' | translate }}</mat-label>
              <input matInput formControlName="phone" placeholder="+998901234567" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'auth.password' | translate }}</mat-label>
              <input matInput type="password" formControlName="password" />
            </mat-form-field>
            @if (errorMessage()) {
              <p class="text-sm text-danger">{{ errorMessage() }}</p>
            }
            <button mat-flat-button color="primary" class="!h-12" [disabled]="passwordForm.invalid || loading()">
              {{ 'auth.loginWithPassword' | translate }}
            </button>
          </form>
        </mat-tab>

        <mat-tab [label]="'auth.loginWithOtp' | translate">
          <div class="pt-4">
            <a routerLink="/auth/otp" class="block">
              <button mat-stroked-button color="primary" class="!h-12 w-full" type="button">
                {{ 'auth.loginWithOtp' | translate }}
              </button>
            </a>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  selectedTab = 0;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly passwordForm = this.fb.nonNullable.group({
    phone: ['', [Validators.required, Validators.pattern(UZ_PHONE_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submitPassword(): void {
    if (this.passwordForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const { phone, password } = this.passwordForm.getRawValue();

    this.auth.loginWithPassword(phone, password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.auth.redirectByRole(res.data.user.role);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.error?.message ?? "Telefon raqam yoki parol noto'g'ri");
      },
    });
  }
}
