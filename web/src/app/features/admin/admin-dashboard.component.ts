import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  template: `
    <div class="p-6">
      <h1 class="text-xl font-semibold">Super Admin</h1>
      <p class="text-sm text-[var(--color-text-muted)]">Platforma boshqaruvi bu yerda bo'ladi.</p>
    </div>
  `,
})
export class AdminDashboardComponent {}
