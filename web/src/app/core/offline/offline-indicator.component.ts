import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { OfflineQueueService } from './offline-queue.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (!queue.isOnline()) {
      <div class="flex items-center justify-center gap-2 bg-warning px-3 py-1.5 text-xs font-medium text-white">
        <span>🟡 {{ 'common.offline' | translate }}</span>
        @if (queue.pendingCount() > 0) {
          <span>· {{ queue.pendingCount() }} ta amal navbatda</span>
        }
      </div>
    }
  `,
})
export class OfflineIndicatorComponent {
  readonly queue = inject(OfflineQueueService);
}
