import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="flex flex-col items-center gap-2 py-10 text-center text-[var(--color-text-muted)]">
      <mat-icon class="!h-12 !w-12 !text-5xl opacity-50">{{ icon }}</mat-icon>
      <p class="font-medium">{{ title }}</p>
      @if (subtitle) {
        <p class="text-sm">{{ subtitle }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = "Ma'lumot yo'q";
  @Input() subtitle?: string;
}
