import { Pipe, PipeTransform } from '@angular/core';
import { format, isValid, parseISO } from 'date-fns';

@Pipe({ name: 'uzDate', standalone: true })
export class UzDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, pattern = 'dd.MM.yyyy'): string {
    if (!value) return '';
    const date = typeof value === 'string' ? parseISO(value) : value;
    if (!isValid(date)) return '';
    return format(date, pattern);
  }
}
