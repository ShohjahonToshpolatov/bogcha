import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

/** `pure: false` — til almashtirilganda ham qayta hisoblanishi uchun. */
@Pipe({ name: 'timeAgo', standalone: true, pure: false })
export class TimeAgoPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < MINUTE) return this.translate.instant('common.justNow');
    if (seconds < HOUR) return this.translate.instant('common.minutesAgo', { count: Math.floor(seconds / MINUTE) });
    if (seconds < DAY) return this.translate.instant('common.hoursAgo', { count: Math.floor(seconds / HOUR) });
    if (seconds < DAY * 7) return this.translate.instant('common.daysAgo', { count: Math.floor(seconds / DAY) });

    const localeMap: Record<string, string> = { uz: 'uz-UZ', 'uz-cy': 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
    const locale = localeMap[this.translate.currentLang() ?? 'uz'] ?? 'uz-UZ';
    return date.toLocaleDateString(locale);
  }
}
