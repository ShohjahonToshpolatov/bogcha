import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'uzMoney', standalone: true })
export class UzMoneyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, currency = "so'm"): string {
    if (value === null || value === undefined || value === '') return '';
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(numeric)) return '';
    const formatted = new Intl.NumberFormat('uz-UZ').format(numeric);
    return `${formatted} ${currency}`;
  }
}
