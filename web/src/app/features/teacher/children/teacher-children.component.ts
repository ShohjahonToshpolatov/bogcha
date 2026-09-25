import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { ChildrenApi } from '../../../core/api/children.api';
import { Child } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth.service';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { UzDatePipe } from '../../../shared/pipes/uz-date.pipe';

@Component({
  selector: 'app-teacher-children',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, AvatarComponent, EmptyStateComponent, UzDatePipe],
  template: `
    <div class="flex flex-col gap-3 p-4">
      <h1 class="text-xl font-semibold">{{ 'children.title' | translate }}</h1>

      @if (loading()) {
        <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
      } @else if (children().length === 0) {
        <app-empty-state icon="child_care" [title]="'children.noChildren' | translate" />
      } @else {
        @for (child of children(); track child.id) {
          <div class="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <app-avatar [fullName]="child.firstName + ' ' + child.lastName" [photoUrl]="child.photoUrl" [size]="44" />
            <div class="flex-1">
              <div class="font-medium">{{ child.firstName }} {{ child.lastName }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">{{ child.birthDate | uzDate }}</div>
              @if (child.allergies?.length) {
                <div class="text-xs text-danger">⚠️ {{ child.allergies?.[0]?.title }}</div>
              }
            </div>
            @if (child.guardians?.length) {
              <a [href]="'tel:' + child.guardians?.[0]?.user?.phone" class="text-primary">
                <mat-icon>call</mat-icon>
              </a>
            }
          </div>
        }
      }
    </div>
  `,
})
export class TeacherChildrenComponent implements OnInit {
  private readonly childrenApi = inject(ChildrenApi);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly children = signal<Child[]>([]);

  ngOnInit(): void {
    const groupId = this.auth.currentUser()?.groupTeacherLinks?.[0]?.groupId;
    this.childrenApi.list({ groupId }).subscribe({
      next: (result) => {
        this.children.set(result.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
