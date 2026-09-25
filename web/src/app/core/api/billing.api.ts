import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from './api-response.model';
import { Debt, Invoice, Payment, PaymentMethod, Tariff, UpsertTariffInput } from './models';

@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  tariffs() {
    return this.http.get<ApiSuccess<Tariff[]>>(`${this.base}/tariffs`).pipe(map((r) => r.data));
  }

  createTariff(input: UpsertTariffInput) {
    return this.http.post<ApiSuccess<Tariff>>(`${this.base}/tariffs`, input).pipe(map((r) => r.data));
  }

  assignTariff(childId: string, tariffId: string, validFrom: string, discountPct = 0) {
    return this.http
      .post<ApiSuccess<unknown>>(`${this.base}/children/${childId}/tariff`, { tariffId, validFrom, discountPct })
      .pipe(map((r) => r.data));
  }

  invoices(period?: string) {
    return this.http
      .get<ApiSuccess<Invoice[]>>(`${this.base}/invoices`, { params: period ? { period } : {} })
      .pipe(map((r) => r.data));
  }

  generateInvoices(period: string) {
    return this.http
      .post<ApiSuccess<{ created: number }>>(`${this.base}/invoices/generate`, { period })
      .pipe(map((r) => r.data));
  }

  payments() {
    return this.http.get<ApiSuccess<Payment[]>>(`${this.base}/payments`).pipe(map((r) => r.data));
  }

  recordPayment(childId: string, amount: string, method: PaymentMethod, invoiceId?: string, note?: string) {
    return this.http
      .post<ApiSuccess<Payment>>(`${this.base}/payments`, { childId, amount, method, invoiceId, note })
      .pipe(map((r) => r.data));
  }

  debts() {
    return this.http.get<ApiSuccess<Debt[]>>(`${this.base}/debts`).pipe(map((r) => r.data));
  }

  myDebt() {
    return this.http.get<ApiSuccess<Debt[]>>(`${this.base}/my-debt`).pipe(map((r) => r.data));
  }
}
