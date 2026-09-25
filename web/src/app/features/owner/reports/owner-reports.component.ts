import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin } from 'rxjs';
import { ReportsApi } from '../../../core/api/reports.api';
import { OccupancyRow } from '../../../core/api/models';

const CHART_COLORS = { primary: '#4f8ef7', danger: '#e5484d' };

@Component({
  selector: 'app-owner-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressBarModule, TranslatePipe, BaseChartDirective],
  template: `
    <h1 class="text-xl font-semibold">{{ 'reports.title' | translate }}</h1>

    <div class="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)]">
        <mat-icon class="!h-4 !w-4 !text-base">show_chart</mat-icon>
        {{ 'reports.attendanceTrend' | translate }}
      </div>
      <div class="h-64">
        <canvas baseChart [data]="attendanceChartData()" [options]="lineChartOptions" type="line"></canvas>
      </div>
    </div>

    <div class="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)]">
        <mat-icon class="!h-4 !w-4 !text-base">pie_chart</mat-icon>
        {{ 'reports.occupancy' | translate }}
      </div>
      <div class="flex flex-col gap-4">
        @for (row of occupancy(); track row.groupId) {
          <div>
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium">{{ row.name }}</span>
              <span class="text-[var(--color-text-muted)]">{{ row.enrolled }} / {{ row.capacity }} ({{ row.percentage }}%)</span>
            </div>
            <mat-progress-bar class="mt-1.5 !rounded-full" mode="determinate" [value]="row.percentage" />
          </div>
        }
      </div>
    </div>
  `,
})
export class OwnerReportsComponent implements OnInit {
  private readonly api = inject(ReportsApi);
  private readonly translate = inject(TranslateService);

  readonly occupancy = signal<OccupancyRow[]>([]);
  readonly attendanceChartData = signal<ChartConfiguration<'line'>['data']>({ labels: [], datasets: [] });

  readonly lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  ngOnInit(): void {
    forkJoin([this.api.occupancy(), this.api.attendanceTrend(14)]).subscribe(([occupancy, trend]) => {
      this.occupancy.set(occupancy);
      this.attendanceChartData.set({
        labels: trend.map((t) => t.date.slice(5)),
        datasets: [
          {
            label: this.translate.instant('attendance.present'),
            data: trend.map((t) => t.present),
            borderColor: CHART_COLORS.primary,
            backgroundColor: CHART_COLORS.primary + '22',
            fill: true,
            tension: 0.3,
          },
          {
            label: this.translate.instant('attendance.absent'),
            data: trend.map((t) => t.absent),
            borderColor: CHART_COLORS.danger,
            backgroundColor: CHART_COLORS.danger + '22',
            fill: true,
            tension: 0.3,
          },
        ],
      });
    });
  }
}
