import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../auth/auth.service';
import { OfflineIndicatorComponent } from '../../offline/offline-indicator.component';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher.component';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
}

@Component({
  selector: 'app-parent-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    TranslatePipe,
    OfflineIndicatorComponent,
    LanguageSwitcherComponent,
  ],
  template: `
    <div class="bogcha-bg mx-auto flex h-dvh max-w-[720px] flex-col">
      <app-offline-indicator />
      <header class="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-3 py-1.5 backdrop-blur">
        <span class="flex items-center gap-1.5 font-semibold text-primary">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
            <mat-icon class="!text-base text-white">child_care</mat-icon>
          </span>
          Bog'cham
        </span>
        <div class="flex items-center gap-1">
          <app-language-switcher />
          <button mat-icon-button (click)="auth.logout()" [attr.aria-label]="'common.logout' | translate">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </header>
      <main class="flex-1 overflow-y-auto pb-20">
        <router-outlet />
      </main>
      <nav
        class="fixed bottom-0 left-1/2 z-10 flex w-full max-w-[720px] -translate-x-1/2 items-stretch border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur"
      >
        @for (item of navItems; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="text-primary"
            class="flex flex-1 flex-col items-center gap-0.5 py-2 text-[var(--color-text-muted)] no-underline"
          >
            <mat-icon>{{ item.icon }}</mat-icon>
            <span class="text-[11px]">{{ item.labelKey | translate }}</span>
          </a>
        }
      </nav>
    </div>
  `,
})
export class ParentShellComponent {
  readonly auth = inject(AuthService);

  readonly navItems: NavItem[] = [
    { path: '/parent/home', icon: 'home', labelKey: 'nav.home' },
    { path: '/parent/feed', icon: 'photo_library', labelKey: 'nav.feed' },
    { path: '/parent/camera', icon: 'videocam', labelKey: 'nav.camera' },
    { path: '/parent/messages', icon: 'chat', labelKey: 'nav.messages' },
    { path: '/parent/menu', icon: 'restaurant', labelKey: 'nav.menu' },
  ];
}
