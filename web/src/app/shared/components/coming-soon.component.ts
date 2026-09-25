import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  template: `
    <div class="flex flex-col items-center gap-4 px-6 py-20 text-center">
      <div class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-accent/15">
        <mat-icon class="!h-9 !w-9 !text-4xl text-primary">{{ icon }}</mat-icon>
      </div>
      <div>
        <h2 class="text-lg font-semibold text-[var(--color-text)]">{{ titleKey | translate }}</h2>
        <p class="mx-auto mt-1 max-w-xs text-sm text-[var(--color-text-muted)]">{{ 'common.comingSoonDesc' | translate }}</p>
      </div>
    </div>
  `,
})
export class ComingSoonComponent {
  @Input() icon = 'auto_awesome';
  @Input() titleKey = 'common.comingSoon';
}
