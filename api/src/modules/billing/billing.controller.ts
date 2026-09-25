import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoiceStatus, PaymentMethod, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { AssignTariffDto } from './dto/assign-tariff.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UpsertTariffDto } from './dto/upsert-tariff.dto';
import { BillingService } from './billing.service';

@ApiTags('billing')
@ApiBearerAuth()
@Roles(Role.OWNER, Role.ADMIN)
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('tariffs')
  tariffs() {
    return this.billing.tariffs();
  }

  @Post('tariffs')
  createTariff(@Body() dto: UpsertTariffDto) {
    return this.billing.createTariff(dto);
  }

  @Patch('tariffs/:id')
  updateTariff(@Param('id') id: string, @Body() dto: Partial<UpsertTariffDto>) {
    return this.billing.updateTariff(id, dto);
  }

  @Delete('tariffs/:id')
  removeTariff(@Param('id') id: string) {
    return this.billing.removeTariff(id);
  }

  @Post('children/:id/tariff')
  assignTariff(@Param('id') childId: string, @Body() dto: AssignTariffDto) {
    return this.billing.assignTariff(childId, dto);
  }

  @Get('invoices')
  invoices(
    @Query('status') status?: InvoiceStatus,
    @Query('period') period?: string,
    @Query('childId') childId?: string,
  ) {
    return this.billing.invoices({ status, period, childId });
  }

  @Post('invoices/generate')
  generate(@Body() dto: GenerateInvoicesDto) {
    return this.billing.generateInvoices(dto);
  }

  @Post('invoices/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.billing.cancelInvoice(id);
  }

  @Get('payments')
  payments(@Query('from') from?: string, @Query('to') to?: string, @Query('method') method?: PaymentMethod) {
    return this.billing.payments({ from, to, method });
  }

  @Post('payments')
  recordPayment(@Body() dto: RecordPaymentDto, @CurrentUser('userId') userId: string) {
    return this.billing.recordPayment(dto, userId);
  }

  @Get('debts')
  debts(@Query('groupId') groupId?: string) {
    return this.billing.debts(groupId);
  }

  /** Ota-ona — faqat o'z farzandi(lari)ning qarzdorlik holatini ko'radi. */
  @Roles(Role.PARENT)
  @Get('my-debt')
  myDebt(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.debtsForChildren(user.guardianOfChildIds ?? []);
  }
}
