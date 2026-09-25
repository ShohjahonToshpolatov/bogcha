import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval } from 'rxjs';
import { ChildrenApi } from '../../../core/api/children.api';
import { MessagingApi } from '../../../core/api/messaging.api';
import { Child, ThreadListItem, ThreadMessage } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth.service';
import { AvatarComponent } from '../avatar.component';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, AvatarComponent],
  template: `
    <div class="bogcha-bg flex h-full flex-col">
      @if (view() === 'list') {
        <div class="flex items-center justify-between px-4 pt-4 pb-2">
          <h1 class="text-xl font-semibold">Xabarlar</h1>
          <button mat-icon-button class="!bg-[var(--color-surface)] shadow-sm" (click)="openNewPicker()">
            <mat-icon class="text-primary">add_comment</mat-icon>
          </button>
        </div>

        @if (loadingThreads()) {
          <div class="flex flex-1 items-center justify-center"><mat-spinner diameter="32" /></div>
        } @else if (threads().length === 0) {
          <div class="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-md">
              <mat-icon class="!h-8 !w-8 !text-3xl text-white">chat_bubble</mat-icon>
            </div>
            <p class="text-sm text-[var(--color-text-muted)]">Hozircha suhbatlar yo'q. Yangi suhbat boshlash uchun yuqoridagi tugmani bosing.</p>
          </div>
        } @else {
          <div class="flex flex-col gap-2 overflow-y-auto px-3 pb-4">
            @for (t of threads(); track t.id) {
              <button
                class="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-sm transition active:scale-[0.99]"
                (click)="openThread(t)"
              >
                <app-avatar [fullName]="otherNames(t)" [photoUrl]="t.child?.photoUrl ?? null" [size]="48" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate text-sm font-semibold">{{ t.child ? (t.child.firstName + ' ' + t.child.lastName) : otherNames(t) }}</span>
                    @if (t.lastMessageAt) {
                      <span class="shrink-0 text-[11px] text-[var(--color-text-muted)]">{{ formatTime(t.lastMessageAt) }}</span>
                    }
                  </div>
                  <div class="truncate text-xs text-[var(--color-text-muted)]">{{ otherNames(t) }}</div>
                  <div class="truncate text-xs" [class.font-semibold]="t.unread" [class.text-[var(--color-text)]]="t.unread">
                    {{ t.lastMessage?.body ?? 'Suhbatni boshlang...' }}
                  </div>
                </div>
                @if (t.unread) {
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-accent"></span>
                }
              </button>
            }
          </div>
        }
      }

      @if (view() === 'newPicker') {
        <div class="flex items-center gap-2 px-4 pt-4 pb-2">
          <button mat-icon-button (click)="view.set('list')"><mat-icon>arrow_back</mat-icon></button>
          <h1 class="text-lg font-semibold">Kim bilan bog'lanasiz?</h1>
        </div>
        @if (loadingChildren()) {
          <div class="flex flex-1 items-center justify-center"><mat-spinner diameter="32" /></div>
        } @else {
          <div class="flex flex-col gap-2 overflow-y-auto px-3 pb-4">
            @for (c of children(); track c.id) {
              <button
                class="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-sm"
                (click)="startChat(c)"
              >
                <app-avatar [fullName]="c.firstName + ' ' + c.lastName" [photoUrl]="c.photoUrl ?? null" [size]="44" />
                <div>
                  <div class="text-sm font-semibold">{{ c.firstName }} {{ c.lastName }}</div>
                  <div class="text-xs text-[var(--color-text-muted)]">{{ c.group?.name ?? '' }}</div>
                </div>
              </button>
            } @empty {
              <p class="px-2 text-sm text-[var(--color-text-muted)]">Bolalar topilmadi.</p>
            }
          </div>
        }
      }

      @if (view() === 'chat') {
        <div class="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-3 py-3 backdrop-blur">
          <button mat-icon-button (click)="backToList()"><mat-icon>arrow_back</mat-icon></button>
          <app-avatar [fullName]="activeTitle()" [photoUrl]="activeChild()?.photoUrl ?? null" [size]="38" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold">{{ activeTitle() }}</div>
            <div class="truncate text-xs text-[var(--color-text-muted)]">{{ activeSubtitle() }}</div>
          </div>
        </div>

        <div #scrollArea class="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          @if (loadingMessages()) {
            <div class="flex flex-1 items-center justify-center"><mat-spinner diameter="28" /></div>
          } @else if (messages().length === 0) {
            <p class="mt-6 text-center text-xs text-[var(--color-text-muted)]">Hali xabar yo'q. Birinchi xabarni yozing 👋</p>
          }
          @for (m of messages(); track m.id) {
            <div class="flex" [class.justify-end]="isMine(m)">
              <div
                class="max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm"
                [class]="isMine(m)
                  ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-br-md'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-bl-md'"
              >
                @if (!isMine(m)) {
                  <div class="mb-0.5 text-[11px] font-semibold text-primary">{{ m.sender.fullName }}</div>
                }
                <div class="whitespace-pre-wrap">{{ m.body }}</div>
                <div class="mt-0.5 text-right text-[10px] opacity-70">{{ formatTime(m.sentAt) }}</div>
              </div>
            </div>
          }
        </div>

        <div class="flex items-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <textarea
            class="max-h-24 flex-1 resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            rows="1"
            placeholder="Xabar yozing..."
            [(ngModel)]="draft"
            (keydown.enter)="onEnter($event)"
          ></textarea>
          <button
            mat-icon-button
            class="!h-11 !w-11 !bg-gradient-to-br !from-primary !to-accent !text-white shadow-md"
            [disabled]="!draft().trim() || sending()"
            (click)="send()"
          >
            <mat-icon>send</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
})
export class MessagesComponent implements OnInit, OnDestroy {
  private readonly messagingApi = inject(MessagingApi);
  private readonly childrenApi = inject(ChildrenApi);
  private readonly auth = inject(AuthService);

  @ViewChild('scrollArea') private scrollArea?: ElementRef<HTMLDivElement>;

  readonly view = signal<'list' | 'newPicker' | 'chat'>('list');
  readonly threads = signal<ThreadListItem[]>([]);
  readonly children = signal<Child[]>([]);
  readonly messages = signal<ThreadMessage[]>([]);
  readonly loadingThreads = signal(false);
  readonly loadingChildren = signal(false);
  readonly loadingMessages = signal(false);
  readonly sending = signal(false);
  readonly draft = signal('');

  private activeThread = signal<ThreadListItem | null>(null);
  readonly activeChild = signal<Child | null>(null);
  private activeThreadId: string | null = null;
  private pollSub?: { unsubscribe: () => void };

  ngOnInit(): void {
    this.loadThreads();
    this.pollSub = interval(15000).subscribe(() => {
      if (this.view() === 'list') this.loadThreads(true);
      if (this.view() === 'chat' && this.activeThreadId) this.loadMessages(this.activeThreadId, true);
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  loadThreads(silent = false): void {
    if (!silent) this.loadingThreads.set(true);
    this.messagingApi.listThreads().subscribe({
      next: (data) => {
        this.threads.set(data);
        this.loadingThreads.set(false);
      },
      error: () => this.loadingThreads.set(false),
    });
  }

  openNewPicker(): void {
    this.view.set('newPicker');
    this.loadingChildren.set(true);
    this.childrenApi.list({ limit: 100 }).subscribe({
      next: (r) => {
        this.children.set(r.items);
        this.loadingChildren.set(false);
      },
      error: () => this.loadingChildren.set(false),
    });
  }

  startChat(child: Child): void {
    this.activeChild.set(child);
    this.activeThread.set(null);
    this.activeThreadId = null;
    this.messages.set([]);
    this.view.set('chat');
  }

  openThread(thread: ThreadListItem): void {
    this.activeThread.set(thread);
    this.activeChild.set(
      thread.child ? ({ id: thread.child.id, firstName: thread.child.firstName, lastName: thread.child.lastName, photoUrl: thread.child.photoUrl } as Child) : null,
    );
    this.activeThreadId = thread.id;
    this.view.set('chat');
    this.loadMessages(thread.id);
    this.messagingApi.markRead(thread.id).subscribe();
  }

  loadMessages(threadId: string, silent = false): void {
    if (!silent) this.loadingMessages.set(true);
    this.messagingApi.getMessages(threadId).subscribe({
      next: (data) => {
        this.messages.set(data);
        this.loadingMessages.set(false);
        this.scrollToBottom();
      },
      error: () => this.loadingMessages.set(false),
    });
  }

  backToList(): void {
    this.view.set('list');
    this.activeThreadId = null;
    this.loadThreads();
  }

  onEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.send();
    }
  }

  send(): void {
    const body = this.draft().trim();
    if (!body || this.sending()) return;
    this.sending.set(true);

    const request = this.activeThreadId
      ? this.messagingApi.sendMessage(this.activeThreadId, body)
      : this.messagingApi.startOrSend(this.activeChild()!.id, body);

    request.subscribe({
      next: (msg) => {
        this.draft.set('');
        this.sending.set(false);
        this.activeThreadId = msg.threadId;
        this.messages.update((list) => [...list, msg]);
        this.scrollToBottom();
      },
      error: () => this.sending.set(false),
    });
  }

  isMine(m: ThreadMessage): boolean {
    return m.senderId === this.auth.currentUser()?.id;
  }

  otherNames(t: ThreadListItem): string {
    return t.others.map((o) => o.fullName).join(', ') || '—';
  }

  activeTitle(): string {
    const child = this.activeChild();
    const thread = this.activeThread();
    if (child) return `${child.firstName} ${child.lastName}`;
    if (thread) return this.otherNames(thread);
    return '';
  }

  activeSubtitle(): string {
    const thread = this.activeThread();
    return thread ? this.otherNames(thread) : "Yangi suhbat";
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scrollArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
