import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';

const UZ_PHONE_PATTERN = /^\+998\d{9}$/;

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    TranslatePipe,
  ],
  template: `
    <div class="bogcha-bg flex min-h-dvh w-full items-center justify-center p-6">
    <div class="mx-auto flex w-full max-w-[420px] flex-col justify-center gap-6">
      <a routerLink="/auth/login" class="flex items-center gap-1 text-sm text-[var(--color-text-muted)] no-underline">
        <mat-icon class="!text-base">arrow_back</mat-icon>
        {{ 'common.back' | translate }}
      </a>

      <div class="flex flex-col items-center gap-3">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
          <mat-icon class="!h-9 !w-9 !text-4xl text-white">sms</mat-icon>
        </div>
        <h1 class="text-2xl font-semibold">{{ 'auth.loginWithOtp' | translate }}</h1>
      </div>

      @if (!codeSent()) {
        <form [formGroup]="phoneForm" (ngSubmit)="sendCode()" class="flex flex-col gap-3">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'auth.phone' | translate }}</mat-label>
            <input matInput formControlName="phone" placeholder="+998901234567" />
          </mat-form-field>
          @if (errorMessage()) {
            <p class="text-sm text-danger">{{ errorMessage() }}</p>
          }
          <button mat-flat-button color="primary" class="!h-12" [disabled]="phoneForm.invalid || loading()">
            {{ 'auth.sendCode' | translate }}
          </button>
        </form>
      } @else {
        <p class="text-center text-sm text-[var(--color-text-muted)]">
          {{ 'auth.codeSentTo' | translate: { phone: phoneForm.value.phone } }}
        </p>
        <form [formGroup]="codeForm" (ngSubmit)="verifyCode()" class="flex flex-col gap-3">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'auth.verifyCode' | translate }}</mat-label>
            <input matInput formControlName="code" maxlength="6" inputmode="numeric" placeholder="123456" />
          </mat-form-field>
          @if (errorMessage()) {
            <p class="text-sm text-danger">{{ errorMessage() }}</p>
          }
          <button mat-flat-button color="primary" class="!h-12" [disabled]="codeForm.invalid || loading()">
            {{ 'auth.verifyCode' | translate }}
          </button>
        </form>
      }
    </div>
    </div>
  `,
})
export class OtpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly codeSent = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly phoneForm = this.fb.nonNullable.group({
    phone: ['', [Validators.required, Validators.pattern(UZ_PHONE_PATTERN)]],
  });

  readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  sendCode(): void {
    if (this.phoneForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.requestOtp(this.phoneForm.getRawValue().phone).subscribe({
      next: () => {
        this.loading.set(false);
        this.codeSent.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.error?.message ?? "Kod yuborilmadi. Qayta urinib ko'ring.");
      },
    });
  }

  verifyCode(): void {
    if (this.codeForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const phone = this.phoneForm.getRawValue().phone;
    const code = this.codeForm.getRawValue().code;

    this.auth.verifyOtp(phone, code).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.auth.redirectByRole(res.data.user.role);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.error?.message ?? "Kod noto'g'ri");
      },
    });
  }
}
