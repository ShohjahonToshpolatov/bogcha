import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateService } from '@ngx-translate/core';

interface LangOption {
  code: string;
  label: string;
}

const LOCALE_STORAGE_KEY = 'bogcha_locale';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [MatButtonModule, MatMenuModule],
  template: `
    <button mat-button [matMenuTriggerFor]="menu" class="!min-w-0 !px-2">
      {{ currentLabel() }}
    </button>
    <mat-menu #menu="matMenu">
      @for (lang of langs; track lang.code) {
        <button mat-menu-item (click)="setLang(lang.code)">{{ lang.label }}</button>
      }
    </mat-menu>
  `,
})
export class LanguageSwitcherComponent {
  private readonly translate = inject(TranslateService);

  readonly langs: LangOption[] = [
    { code: 'uz', label: "O'zbekcha" },
    { code: 'uz-cy', label: 'Ўзбекча' },
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
  ];

  currentLabel(): string {
    const current = this.translate.currentLang() ?? 'uz';
    return this.langs.find((l) => l.code === current)?.label ?? "O'zbekcha";
  }

  setLang(code: string): void {
    this.translate.use(code);
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  }
}
