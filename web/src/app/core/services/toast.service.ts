import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

/** `key`ni i18n tarjima kaliti sifatida oladi; agar tarjima topilmasa, matn o'zi ko'rsatiladi. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  success(key: string, params?: Record<string, unknown>): void {
    this.snackBar.open(this.translate.instant(key, params), undefined, { duration: 3000, panelClass: 'toast-success' });
  }

  error(key: string, params?: Record<string, unknown>): void {
    this.snackBar.open(this.translate.instant(key, params), undefined, { duration: 5000, panelClass: 'toast-error' });
  }

  info(key: string, params?: Record<string, unknown>): void {
    this.snackBar.open(this.translate.instant(key, params), undefined, { duration: 3000 });
  }
}
