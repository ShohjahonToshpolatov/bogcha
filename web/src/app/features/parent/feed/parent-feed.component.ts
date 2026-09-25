import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { FeedApi } from '../../../core/api/feed.api';
import { DailyPost } from '../../../core/api/models';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-parent-feed',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, AvatarComponent, EmptyStateComponent, TimeAgoPipe],
  template: `
    <div class="flex flex-col gap-3 p-4">
      <h1 class="text-xl font-semibold">{{ 'nav.feed' | translate }}</h1>

      @if (loading()) {
        <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
      } @else if (posts().length === 0) {
        <app-empty-state icon="photo_library" [title]="'parent.noPostsYet' | translate" />
      } @else {
        @for (post of posts(); track post.id) {
          <div class="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div class="flex items-center gap-2.5 p-3.5 pb-2">
              <app-avatar [fullName]="post.author.fullName" [photoUrl]="post.author.avatarUrl" [size]="38" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold">{{ post.author.fullName }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">{{ post.postedAt | timeAgo }}</div>
              </div>
              @if (post.group) {
                <span class="rounded-full px-2 py-0.5 text-xs font-medium text-white" [style.background]="post.group.colorHex">
                  {{ post.group.name }}
                </span>
              }
            </div>

            @if (post.mediaUrls.length) {
              <div
                class="grid gap-0.5"
                [class.grid-cols-1]="post.mediaUrls.length === 1"
                [class.grid-cols-2]="post.mediaUrls.length > 1"
              >
                @for (url of post.mediaUrls; track url) {
                  <img [src]="url" class="aspect-square w-full object-cover" alt="" />
                }
              </div>
            }

            <div class="p-3.5 pt-2.5">
              @if (post.activityTag) {
                <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{{ post.activityTag }}</span>
              }
              @if (post.body) {
                <p class="mt-1.5 text-sm">{{ post.body }}</p>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class ParentFeedComponent implements OnInit {
  private readonly feedApi = inject(FeedApi);

  readonly loading = signal(true);
  readonly posts = signal<DailyPost[]>([]);

  ngOnInit(): void {
    this.feedApi.list().subscribe({
      next: (result) => {
        this.posts.set(result.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
