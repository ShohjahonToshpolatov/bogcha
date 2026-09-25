import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe } from '@ngx-translate/core';
import { BillingApi } from '../../../core/api/billing.api';
import { ChildrenApi } from '../../../core/api/children.api';
import { Child, Debt, Invoice, Payment, Tariff } from '../../../core/api/models';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { UzDatePipe } from '../../../shared/pipes/uz-date.pipe';
import { UzMoneyPipe } from '../../../shared/pipes/uz-money.pipe';
import { PaymentFormDialogComponent } from './payment-form-dialog.component';
import { TariffFormDialogComponent } from './tariff-form-dialog.component';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-owner-finance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    EmptyStateComponent,
    UzDatePipe,
    UzMoneyPipe,
  ],
  template: `
    <h1 class="text-xl font-semibold">{{ 'finance.title' | translate }}</h1>

    <mat-tab-group class="mt-2">
      <mat-tab [label]="'finance.debts' | translate">
        <div class="pt-4">
          @if (debts().length === 0) {
            <app-empty-state icon="check_circle" [title]="'finance.noDebts' | translate" />
          } @else {
            <div class="flex flex-col gap-2">
              @for (d of debts(); track d.id) {
                <div class="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div>
                    <div class="font-medium">{{ d.child.firstName }} {{ d.child.lastName }}</div>
                    <div class="text-xs text-[var(--color-text-muted)]">{{ d.number }} · {{ 'finance.dueDate' | translate }}: {{ d.dueDate | uzDate }}</div>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold text-danger">{{ d.remaining | uzMoney }}</div>
                    @if (d.daysOverdue > 0) {
                      <div class="text-xs text-danger">{{ 'finance.daysOverdue' | translate: { count: d.daysOverdue } }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </mat-tab>

      <mat-tab [label]="'finance.invoices' | translate">
        <div class="pt-4">
          <div class="mb-3 flex items-center gap-2">
            <mat-form-field appearance="outline" class="!m-0 w-40">
              <mat-label>{{ 'finance.period' | translate }}</mat-label>
              <input matInput [(ngModel)]="period" placeholder="2026-09" />
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="generate()">{{ 'finance.generateInvoices' | translate }}</button>
          </div>
          @if (invoices().length === 0) {
            <app-empty-state icon="receipt_long" [title]="'finance.noInvoices' | translate" />
          } @else {
            <div class="flex flex-col gap-2">
              @for (inv of invoices(); track inv.id) {
                <div class="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div>
                    <div class="font-medium">{{ inv.child.firstName }} {{ inv.child.lastName }}</div>
                    <div class="text-xs text-[var(--color-text-muted)]">{{ inv.number }} · {{ inv.period }}</div>
                  </div>
                  <div class="text-right font-semibold">{{ inv.totalAmount | uzMoney }}</div>
                </div>
              }
            </div>
          }
        </div>
      </mat-tab>

      <mat-tab [label]="'finance.payments' | translate">
        <div class="pt-4">
          <button mat-flat-button color="primary" class="mb-3" (click)="openPaymentDialog()">
            <mat-icon>payments</mat-icon>
            {{ 'finance.recordPayment' | translate }}
          </button>
          <div class="flex flex-col gap-2">
            @for (p of payments(); track p.id) {
              <div class="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div>
                  <div class="font-medium">{{ p.child.firstName }} {{ p.child.lastName }}</div>
                  <div class="text-xs text-[var(--color-text-muted)]">{{ p.paidAt | uzDate }}</div>
                </div>
                <div class="font-semibold text-success">+{{ p.amount | uzMoney }}</div>
              </div>
            }
          </div>
        </div>
      </mat-tab>

      <mat-tab [label]="'finance.tariffs' | translate">
        <div class="pt-4">
          <button mat-flat-button color="primary" class="mb-3" (click)="openTariffDialog()">
            <mat-icon>add</mat-icon>
            {{ 'finance.addTariff' | translate }}
          </button>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (t of tariffs(); track t.id) {
              <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div class="font-semibold">{{ t.name }}</div>
                <div class="mt-1 text-lg">{{ t.monthlyAmount | uzMoney }}</div>
              </div>
            }
          </div>
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
})
export class OwnerFinanceComponent implements OnInit {
  private readonly billing = inject(BillingApi);
  private readonly childrenApi = inject(ChildrenApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly debts = signal<Debt[]>([]);
  readonly invoices = signal<Invoice[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly tariffs = signal<Tariff[]>([]);
  private children: Child[] = [];
  period = currentPeriod();

  ngOnInit(): void {
    this.refreshAll();
    this.childrenApi.list({ limit: 200 }).subscribe((res) => (this.children = res.items));
  }

  refreshAll(): void {
    this.billing.debts().subscribe((d) => this.debts.set(d));
    this.billing.invoices(this.period).subscribe((i) => this.invoices.set(i));
    this.billing.payments().subscribe((p) => this.payments.set(p));
    this.billing.tariffs().subscribe((t) => this.tariffs.set(t));
  }

  generate(): void {
    this.billing.generateInvoices(this.period).subscribe({
      next: () => {
        this.toast.success('common.success');
        this.refreshAll();
      },
      error: () => this.toast.error('common.error'),
    });
  }

  openTariffDialog(): void {
    const ref = this.dialog.open(TariffFormDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.billing.createTariff(result).subscribe({
        next: () => {
          this.toast.success('common.success');
          this.billing.tariffs().subscribe((t) => this.tariffs.set(t));
        },
        error: () => this.toast.error('common.error'),
      });
    });
  }

  openPaymentDialog(): void {
    const ref = this.dialog.open(PaymentFormDialogComponent, { width: '400px', data: { children: this.children } });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.billing.recordPayment(result.childId, result.amount, result.method).subscribe({
        next: () => {
          this.toast.success('common.success');
          this.refreshAll();
        },
        error: () => this.toast.error('common.error'),
      });
    });
  }
}
