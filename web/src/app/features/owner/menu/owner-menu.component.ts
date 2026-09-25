import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { MatDialog } from '@angular/material/dialog';
import { BranchesApi } from '../../../core/api/branches.api';
import { MenuApi } from '../../../core/api/menu.api';
import { Branch, MealType, MenuDay } from '../../../core/api/models';
import { ToastService } from '../../../core/services/toast.service';
import { MenuDayDialogComponent } from './menu-day-dialog.component';

const MEAL_TYPES: { type: MealType; labelKey: string; icon: string }[] = [
  { type: MealType.BREAKFAST, labelKey: 'menu.breakfast', icon: 'free_breakfast' },
  { type: MealType.LUNCH, labelKey: 'menu.lunch', icon: 'lunch_dining' },
  { type: MealType.SNACK, labelKey: 'menu.snack', icon: 'cookie' },
  { type: MealType.DINNER, labelKey: 'menu.dinner', icon: 'dinner_dining' },
];

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

@Component({
  selector: 'app-owner-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold">{{ 'menu.title' | translate }}</h1>
      <div class="flex items-center gap-2">
        <button mat-icon-button (click)="shiftWeek(-1)"><mat-icon>chevron_left</mat-icon></button>
        <span class="text-sm">{{ weekStartIso }}</span>
        <button mat-icon-button (click)="shiftWeek(1)"><mat-icon>chevron_right</mat-icon></button>
        <button mat-stroked-button (click)="copyToNextWeek()">
          <mat-icon>content_copy</mat-icon>
          {{ 'menu.copyWeek' | translate }}
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
    } @else {
      <div class="mt-4 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <table class="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr class="bg-[var(--color-bg)]">
              <th class="p-3 text-left"></th>
              @for (day of weekDays; track day.iso) {
                <th class="p-3 text-left font-medium" [class.text-primary]="day.iso === todayIso">{{ day.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (meal of mealTypes; track meal.type) {
              <tr class="border-t border-[var(--color-border)]">
                <td class="p-3 font-medium text-[var(--color-text-muted)]">
                  <span class="flex items-center gap-1.5">
                    <mat-icon class="!h-4 !w-4 !text-base">{{ meal.icon }}</mat-icon>
                    {{ meal.labelKey | translate }}
                  </span>
                </td>
                @for (day of weekDays; track day.iso) {
                  <td
                    class="cursor-pointer p-3 align-top transition-colors hover:bg-primary/5"
                    [style.background]="day.iso === todayIso ? 'rgba(79,142,247,0.06)' : null"
                    (click)="editCell(day.iso, meal.type)"
                  >
                    @if (dishesFor(day.iso, meal.type).length) {
                      <div class="flex flex-col gap-1">
                        @for (d of dishesFor(day.iso, meal.type); track d.name) {
                          <span class="w-fit rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-xs">{{ d.name }}</span>
                        }
                      </div>
                    } @else {
                      <span class="text-sm text-[var(--color-border)]">+</span>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class OwnerMenuComponent implements OnInit {
  private readonly menuApi = inject(MenuApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly mealTypes = MEAL_TYPES;
  readonly loading = signal(true);
  readonly todayIso = toIso(new Date());
  private menuDays = signal<MenuDay[]>([]);
  private branch: Branch | null = null;
  private weekStart = mondayOf(new Date());

  get weekStartIso(): string {
    return toIso(this.weekStart);
  }

  get weekDays(): { iso: string; label: string }[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      const weekdayLabel = this.translate.instant(`days.${WEEKDAY_KEYS[d.getDay()]}`);
      return { iso: toIso(d), label: `${format(d, 'dd.MM')}, ${weekdayLabel}` };
    });
  }

  ngOnInit(): void {
    this.branchesApi.list().subscribe((branches) => {
      this.branch = branches[0] ?? null;
      this.refresh();
    });
  }

  dishesFor(dateIso: string, mealType: MealType) {
    return this.menuDays().find((m) => m.date.slice(0, 10) === dateIso && m.mealType === mealType)?.dishes ?? [];
  }

  refresh(): void {
    if (!this.branch) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const to = new Date(this.weekStart);
    to.setDate(to.getDate() + 6);
    this.menuApi.list(this.branch.id, this.weekStartIso, toIso(to)).subscribe({
      next: (days) => {
        this.menuDays.set(days);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  shiftWeek(delta: number): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + delta * 7);
    this.weekStart = d;
    this.refresh();
  }

  editCell(dateIso: string, mealType: MealType): void {
    if (!this.branch) return;
    const meal = MEAL_TYPES.find((m) => m.type === mealType)!;
    const ref = this.dialog.open(MenuDayDialogComponent, {
      width: '420px',
      data: {
        dishes: this.dishesFor(dateIso, mealType),
        dateLabel: dateIso,
        mealLabel: this.translate.instant(meal.labelKey),
      },
    });
    ref.afterClosed().subscribe((dishes) => {
      if (!dishes) return;
      this.menuApi.upsert({ branchId: this.branch!.id, date: dateIso, mealType, dishes }).subscribe({
        next: () => {
          this.toast.success('common.success');
          this.refresh();
        },
        error: () => this.toast.error('common.error'),
      });
    });
  }

  copyToNextWeek(): void {
    if (!this.branch) return;
    const nextStart = new Date(this.weekStart);
    nextStart.setDate(nextStart.getDate() + 7);
    this.menuApi.copyWeek(this.weekStartIso, toIso(nextStart), this.branch.id).subscribe({
      next: () => this.toast.success('common.success'),
      error: () => this.toast.error('common.error'),
    });
  }
}
