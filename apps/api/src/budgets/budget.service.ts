import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { Tariff } from '../entities/tariff.entity';
import { CreateBudgetDto, UpdateBudgetDto } from '../dto/api.dto';
import { TariffService } from '../tariffs/tariff.service';
import { BudgetStatus } from '../common/types';

export interface BudgetWithStatus extends Budget {
  spent: number;
  usedPct: number;
  projection: number;
  status: BudgetStatus;
  meterName?: string;
}

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(Budget) private readonly budgetsRepo: Repository<Budget>,
    @InjectRepository(Meter) private readonly metersRepo: Repository<Meter>,
    @InjectRepository(Reading) private readonly readingsRepo: Repository<Reading>,
    private readonly tariffService: TariffService,
  ) {}

  async list(userId: string, period: string): Promise<BudgetWithStatus[]> {
    const start = this.monthStart(period);
    const budgets = await this.budgetsRepo.find({
      where: { userId, period: start },
      order: { createdAt: 'DESC' },
    });
    const meters = await this.metersRepo.find({ where: { userId }, relations: { tariff: true } });
    const meterMap = new Map(meters.map((m) => [m.id, m]));
    const result: BudgetWithStatus[] = [];
    for (const b of budgets) {
      result.push(await this.withStatus(userId, b, meterMap.get(b.meterId)));
    }
    return result;
  }

  async create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const meter = await this.metersRepo.findOne({ where: { id: dto.meterId, userId } });
    if (!meter) throw new BadRequestException('METER_NOT_FOUND');
    const period = this.monthStart(dto.period);
    const dup = await this.budgetsRepo.findOne({ where: { meterId: dto.meterId, period } });
    if (dup) throw new ConflictException('BUDGET_PERIOD_DUPLICATE');
    if (dto.amount <= 0) throw new BadRequestException('AMOUNT_MUST_BE_POSITIVE');
    const budget = this.budgetsRepo.create({
      userId,
      meterId: dto.meterId,
      period,
      amount: dto.amount,
    } as any);
    return (await this.budgetsRepo.save(budget)) as unknown as Budget;
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.findOne(userId, id);
    if (dto.amount !== undefined) {
      if (dto.amount <= 0) throw new BadRequestException('AMOUNT_MUST_BE_POSITIVE');
      budget.amount = dto.amount;
    }
    return (await this.budgetsRepo.save(budget)) as unknown as Budget;
  }

  async remove(userId: string, id: string): Promise<void> {
    const budget = await this.findOne(userId, id);
    await this.budgetsRepo.delete({ id: budget.id });
  }

  async findOne(userId: string, id: string): Promise<Budget> {
    const budget = await this.budgetsRepo.findOne({ where: { id, userId } });
    if (!budget) throw new NotFoundException('BUDGET_NOT_FOUND');
    return budget;
  }

  /** Estado del presupuesto: spent acumulado + proyección lineal + estado. */
  private async withStatus(userId: string, budget: Budget, meter?: Meter): Promise<BudgetWithStatus> {
    const [year, month] = budget.period.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const readings = await this.readingsRepo.createQueryBuilder('r')
      .where('r.meterId = :meterId', { meterId: budget.meterId })
      .andWhere('r.periodStart >= :s', { s: monthStart })
      .andWhere('r.periodStart < :e', { e: monthEnd })
      .orderBy('r.periodStart', 'ASC')
      .getMany();

    let spent = 0;
    if (meter?.tariff) {
      for (const r of readings) {
        spent += this.tariffService.calculateCost(meter.tariff, Number(r.value), r.periodStart, r.periodEnd).variable;
      }
      if (readings.length > 0) spent += Number(meter.tariff.fixedFee);
    } else {
      // Sin tarifa: coste = 0 (mostrar 0, no "gratis" — el frontend muestra hint)
      spent = 0;
    }

    const amount = Number(budget.amount);
    const usedPct = amount > 0 ? round((spent / amount) * 100, 1) : 0;
    // Proyección lineal: spent / días transcurridos × días del mes
    const now = new Date();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const today = Math.min(Math.max(now.getUTCDate(), 1), daysInMonth);
    // Si el mes es futuro, usar 1 día para no dividir por 0
    const daysElapsed = Math.max(1, now >= monthEnd ? daysInMonth : today);
    const projection = daysElapsed > 0 ? round((spent / daysElapsed) * daysInMonth, 2) : 0;

    let status: BudgetStatus = 'on_track';
    if (spent > amount) status = 'exceeded';
    else if (projection > amount) status = 'at_risk';

    return {
      ...budget,
      spent: round(spent, 2),
      usedPct,
      projection,
      status,
      meterName: meter?.name,
    };
  }

  private monthStart(period: string): string {
    const m = period.match(/^(\d{4})-(\d{2})(?:-01)?$/);
    if (!m) throw new BadRequestException('INVALID_PERIOD');
    return `${m[1]}-${m[2]}-01`;
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
