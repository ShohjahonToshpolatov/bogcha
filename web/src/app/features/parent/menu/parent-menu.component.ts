import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ChildrenApi } from '../../../core/api/children.api';
import { MenuApi } from '../../../core/api/menu.api';
import { MealType, MenuDay } from '../../../core/api/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

const MEAL_LABELS: Record<MealType, string> = {
  [MealType.BREAKFAST]: 'menu.breakfast',
  [MealType.LUNCH]: 'menu.lunch',
  [MealType.SNACK]: 'menu.snack',
  [MealType.DINNER]: 'menu.dinner',
};

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-parent-menu',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, EmptyStateComponent],
  template: `
    <div class="flex flex-col gap-3 p-4">
      <h1 class="text-xl font-semibold">{{ 'menu.title' | translate }}</h1>

      @if (loading()) {
        <div class="flex justify-center py-10"><mat-spinner diameter="32" /></div>
      } @else if (days.length === 0) {
        <app-empty-state icon="restaurant" [title]="'menu.noMenu' | translate" />
      } @else {
        @for (day of days; track day.iso) {
          <mat-card class="!rounded-lg !p-4" [class.ring-2]="day.iso === todayIso" [class.ring-primary]="day.iso === todayIso">
            <div class="font-semibold">{{ day.label }}</div>
            <div class="mt-2 flex flex-col gap-2">
              @for (mealType of mealTypes; track mealType) {
                <div>
                  <div class="text-xs font-medium text-[var(--color-text-muted)]">{{ mealLabel(mealType) | translate }}</div>
                  @if (dishesFor(day.iso, mealType).length) {
                    <div class="mt-0.5 flex flex-wrap gap-1">
                      @for (dish of dishesFor(day.iso, mealType); track dish.name) {
                        <span
                          class="rounded-full px-2 py-0.5 text-sm"
                          [style.background]="isAllergen(dish) ? 'var(--color-danger)' : 'var(--color-bg)'"
                          [style.color]="isAllergen(dish) ? 'white' : 'inherit'"
                          [title]="isAllergen(dish) ? ('menu.allergenWarning' | translate) : ''"
                        >
                          @if (isAllergen(dish)) { ⚠️ }
                          {{ dish.name }}
                        </span>
                      }
                    </div>
                  } @else {
                    <span class="text-sm text-[var(--color-text-muted)]">—</span>
                  }
                </div>
              }
            </div>
          </mat-card>
        }
      }
    </div>
  `,
})
export class ParentMenuComponent implements OnInit {
  private readonly menuApi = inject(MenuApi);
  private readonly childrenApi = inject(ChildrenApi);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly mealTypes = Object.values(MealType);
  private menuDays = signal<MenuDay[]>([]);
  readonly todayIso = toIso(new Date());
  days: { iso: string; label: string }[] = [];
  private allergyTitles: string[] = [];

  ngOnInit(): void {
    const weekStart = mondayOf(new Date());
    this.days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const weekdayLabel = this.translate.instant(`days.${WEEKDAY_KEYS[d.getDay()]}`);
      return { iso: toIso(d), label: `${format(d, 'dd.MM')}, ${weekdayLabel}` };
    });

    this.childrenApi.list({ limit: 1 }).subscribe({
      next: (res) => {
        const branchId = res.items[0]?.branchId;
        this.allergyTitles = (res.items[0]?.allergies ?? []).map((a) => a.title.toLowerCase());
        if (!branchId) {
          this.loading.set(false);
          return;
        }
        const to = new Date(weekStart);
        to.setDate(to.getDate() + 6);
        this.menuApi.list(branchId, toIso(weekStart), toIso(to)).subscribe({
          next: (menuDays) => {
            this.menuDays.set(menuDays);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  mealLabel(type: MealType): string {
    return MEAL_LABELS[type];
  }

  dishesFor(dateIso: string, mealType: MealType) {
    return this.menuDays().find((m) => m.date.slice(0, 10) === dateIso && m.mealType === mealType)?.dishes ?? [];
  }

  isAllergen(dish: { allergens?: string[] }): boolean {
    if (!dish.allergens?.length || this.allergyTitles.length === 0) return false;
    return dish.allergens.some((a) => this.allergyTitles.includes(a.toLowerCase()));
  }
}
