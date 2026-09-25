import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin } from 'rxjs';
import { ReportsApi } from '../../../core/api/reports.api';
import { DashboardStats } from '../../../core/api/models';
import { UzMoneyPipe } from '../../../shared/pipes/uz-money.pipe';

const CHART_COLORS = {
  primary: '#4f8ef7',
  accent: '#ffb020',
  success: '#2fb574',
  danger: '#e5484d',
  muted: '#6b7789',
};

interface KpiCard {
  icon: string;
  iconClass: string;
  value: string;
  labelKey: string;
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, TranslatePipe, UzMoneyPipe, BaseChartDirective],
  template: `
    <div class="flex flex-col gap-4">
      <h1 class="text-xl font-semibold">{{ 'nav.dashboard' | translate }}</h1>

      @if (stats(); as s) {
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          @for (card of kpiCards(s); track card.labelKey) {
            <mat-card class="!rounded-xl !p-4 !shadow-sm">
              <mat-icon [class]="card.iconClass">{{ card.icon }}</mat-icon>
              <div class="mt-2 text-xl font-semibold">{{ card.value }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">{{ card.labelKey | translate }}</div>
            </mat-card>
          }
        </div>
      }

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <mat-card class="!rounded-xl !p-4 lg:col-span-2">
          <div class="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">{{ 'reports.attendanceTrend' | translate }}</div>
          <div class="h-64">
            <canvas baseChart [data]="attendanceChartData()" [options]="lineChartOptions" type="line"></canvas>
          </div>
        </mat-card>

        <mat-card class="!rounded-xl !p-4">
          <div class="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">{{ 'reports.genderBreakdown' | translate }}</div>
          <div class="flex h-64 items-center justify-center">
            <canvas baseChart [data]="genderChartData()" [options]="doughnutOptions" type="doughnut"></canvas>
          </div>
        </mat-card>
      </div>

      <mat-card class="!rounded-xl !p-4">
        <div class="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">{{ 'reports.occupancyByGroup' | translate }}</div>
        <div class="h-64">
          <canvas baseChart [data]="occupancyChartData()" [options]="barChartOptions" type="bar"></canvas>
        </div>
      </mat-card>
    </div>
  `,
})
export class OwnerDashboardComponent implements OnInit {
  private readonly api = inject(ReportsApi);
  private readonly translate = inject(TranslateService);

  readonly stats = signal<DashboardStats | null>(null);

  readonly attendanceChartData = signal<ChartConfiguration<'line'>['data']>({ labels: [], datasets: [] });
  readonly occupancyChartData = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });
  readonly genderChartData = signal<ChartConfiguration<'doughnut'>['data']>({ labels: [], datasets: [] });

  readonly lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  kpiCards(s: DashboardStats): KpiCard[] {
    return [
      { icon: 'child_care', iconClass: 'text-primary', value: `${s.presentToday} / ${s.totalActive}`, labelKey: 'reports.presentToday' },
      { icon: 'payments', iconClass: 'text-success', value: new UzMoneyPipe().transform(s.monthRevenue), labelKey: 'reports.monthRevenue' },
      { icon: 'report', iconClass: 'text-danger', value: new UzMoneyPipe().transform(s.debtTotal), labelKey: 'reports.debtTotal' },
      { icon: 'groups', iconClass: 'text-primary', value: `${s.totalActive} / ${s.capacity}`, labelKey: 'reports.capacity' },
      { icon: 'pending_actions', iconClass: 'text-accent', value: `${s.newWaitlist}`, labelKey: 'reports.newWaitlist' },
      { icon: 'badge', iconClass: 'text-primary', value: `${s.staffActive} / ${s.staffCount}`, labelKey: 'reports.staff' },
    ];
  }

  ngOnInit(): void {
    forkJoin([this.api.dashboard(), this.api.attendanceTrend(14), this.api.occupancy(), this.api.genderBreakdown()]).subscribe(
      ([dashboard, trend, occupancy, gender]) => {
        this.stats.set(dashboard);

        this.attendanceChartData.set({
          labels: trend.map((t) => t.date.slice(5)),
          datasets: [
            {
              label: this.translate.instant('attendance.present'),
              data: trend.map((t) => t.present),
              borderColor: CHART_COLORS.primary,
              backgroundColor: CHART_COLORS.primary + '33',
              fill: true,
              tension: 0.3,
            },
            {
              label: this.translate.instant('attendance.absent'),
              data: trend.map((t) => t.absent),
              borderColor: CHART_COLORS.danger,
              backgroundColor: CHART_COLORS.danger + '33',
              fill: true,
              tension: 0.3,
            },
          ],
        });

        this.occupancyChartData.set({
          labels: occupancy.map((o) => o.name),
          datasets: [
            { label: this.translate.instant('groups.title'), data: occupancy.map((o) => o.enrolled), backgroundColor: CHART_COLORS.primary },
            { label: this.translate.instant('groups.capacity'), data: occupancy.map((o) => o.capacity), backgroundColor: '#e3e8ef' },
          ],
        });

        this.genderChartData.set({
          labels: [this.translate.instant('children.male'), this.translate.instant('children.female')],
          datasets: [{ data: [gender.male, gender.female], backgroundColor: [CHART_COLORS.primary, CHART_COLORS.accent] }],
        });
      },
    );
  }
}
