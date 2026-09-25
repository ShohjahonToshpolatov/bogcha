import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  success: { bg: 'bg-success/10', text: 'text-success' },
  danger: { bg: 'bg-danger/10', text: 'text-danger' },
  accent: { bg: 'bg-accent/10', text: 'text-accent' },
  muted: { bg: 'bg-[var(--color-bg)]', text: 'text-[var(--color-text-muted)]' },
};

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" [class]="colors.bg">
        <mat-icon [class]="colors.text">{{ icon }}</mat-icon>
      </div>
      <div class="min-w-0">
        <div class="truncate text-lg font-semibold leading-tight">{{ value }}</div>
        <div class="truncate text-xs text-[var(--color-text-muted)]">{{ label }}</div>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  @Input() icon = 'info';
  @Input() value: string | number = '';
  @Input() label = '';
  @Input() color: keyof typeof COLOR_CLASSES = 'primary';

  get colors() {
    return COLOR_CLASSES[this.color] ?? COLOR_CLASSES['primary'];
  }
}
