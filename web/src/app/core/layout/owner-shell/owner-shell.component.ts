import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher.component';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
}

@Component({
  selector: 'app-owner-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    TranslatePipe,
    LanguageSwitcherComponent,
  ],
  template: `
    <mat-sidenav-container class="h-dvh">
      <mat-sidenav #sidenav [mode]="isMobile() ? 'over' : 'side'" [opened]="!isMobile()" class="w-64">
        <div class="flex items-center gap-2.5 p-4">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
            <mat-icon class="!text-lg text-white">child_care</mat-icon>
          </div>
          <span class="text-lg font-semibold">Bog'cham</span>
        </div>
        <mat-nav-list>
          @for (item of navItems; track item.path) {
            <a mat-list-item [routerLink]="item.path" routerLinkActive="bg-primary/10 text-primary">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.labelKey | translate }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="bogcha-bg">
        <mat-toolbar class="!bg-[var(--color-surface)]/90 !text-[var(--color-text)] backdrop-blur">
          @if (isMobile()) {
            <button mat-icon-button (click)="sidenav.toggle()">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="flex-1"></span>
          <app-language-switcher />
          <span class="mx-3 text-sm">{{ auth.currentUser()?.fullName }}</span>
          <button mat-icon-button (click)="auth.logout()" [attr.aria-label]="'common.logout' | translate">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        <main class="p-4">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class OwnerShellComponent {
  readonly auth = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly isMobile = signal(false);

  readonly navItems: NavItem[] = [
    { path: '/owner/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard' },
    { path: '/owner/children', icon: 'child_care', labelKey: 'nav.children' },
    { path: '/owner/groups', icon: 'groups', labelKey: 'nav.groups' },
    { path: '/owner/attendance', icon: 'fact_check', labelKey: 'nav.attendance' },
    { path: '/owner/finance', icon: 'payments', labelKey: 'nav.finance' },
    { path: '/owner/staff', icon: 'badge', labelKey: 'nav.staff' },
    { path: '/owner/cameras', icon: 'videocam', labelKey: 'nav.cameras' },
    { path: '/owner/announcements', icon: 'campaign', labelKey: 'nav.announcements' },
    { path: '/owner/menu', icon: 'restaurant', labelKey: 'nav.menu' },
    { path: '/owner/waitlist', icon: 'pending_actions', labelKey: 'nav.waitlist' },
    { path: '/owner/reports', icon: 'bar_chart', labelKey: 'nav.reports' },
    { path: '/owner/settings', icon: 'settings', labelKey: 'nav.settings' },
  ];

  constructor() {
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.Tablet])
      .pipe(map((result) => result.matches))
      .subscribe((matches) => this.isMobile.set(matches));
  }
}
