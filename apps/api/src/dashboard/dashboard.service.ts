import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Anomaly } from '../entities/anomaly.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { Tariff } from '../entities/tariff.entity';
import { Budget } from '../entities/budget.entity';
import { User } from '../entities/user.entity';
import { TariffService } from '../tariffs/tariff.service';
import { UTILITY_LABELS, UTILITY_UNITS, UtilityType } from '../common/types';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Meter) private readonly metersRepo: Repository<Meter>,
    @InjectRepository(Reading) private readonly readingsRepo: Repository<Reading>,
    @InjectRepository(Tariff) private readonly tariffsRepo: Repository<Tariff>,
    @InjectRepository(Anomaly) private readonly anomaliesRepo: Repository<Anomaly>,
    @InjectRepository(Budget) private readonly budgetsRepo: Repository<Budget>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly tariffService: TariffService,
  ) {}

  async summary(userId: string) {
    const meters = await this.metersRepo.find({ where: { userId, active: true }, relations: { tariff: true } });
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const kpis: any[] = [];
    const types: UtilityType[] = ['electricity', 'water', 'gas'];
    for (const type of types) {
      const typeMeters = meters.filter((m) => m.utilityType === type);
      let today = 0;
      let month = 0;
      let yesterday = 0;
      let monthCost = 0;
      for (const meter of typeMeters) {
        const readings = await this.readingsRepo.find({ where: { meterId: meter.id } });
        for (const r of readings) {
          const ts = new Date(r.periodStart).getTime();
          const v = Number(r.value);
          if (ts >= dayStart.getTime()) today += v;
          if (ts >= monthStart.getTime()) {
            month += v;
            if (meter.tariff) {
              monthCost += this.tariffService.calculateCost(meter.tariff, v, r.periodStart, r.periodEnd).variable;
            }
          }
          if (ts >= yesterdayStart.getTime() && ts < dayStart.getTime()) yesterday += v;
        }
        if (meter.tariff) {
          const count = await this.readingsRepo.count({
            where: { meterId: meter.id },
          });
          if (count > 0 && month > 0) monthCost += Number(meter.tariff.fixedFee);
        }
      }
      const deltaPct = yesterday > 0 ? round(((today - yesterday) / yesterday) * 100, 1) : null;
      kpis.push({
        utility: type,
        label: UTILITY_LABELS[type],
        unit: UTILITY_UNITS[type],
        today: round(today, 3),
        month: round(month, 3),
        monthCost: round(monthCost, 2),
        deltaPct,
      });
    }

    // Presupuesto global del mes
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const budgets = await this.budgetsRepo.find({ where: { userId, period } });
    let budgetGlobal: any = null;
    if (budgets.length > 0) {
      const amount = budgets.reduce((a, b) => a + Number(b.amount), 0);
      const monthKpis = kpis.reduce((a, k) => a + k.monthCost, 0);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysElapsed = Math.max(1, now.getDate());
      const projection = (monthKpis / daysElapsed) * daysInMonth;
      budgetGlobal = {
        amount: round(amount, 2),
        spent: round(monthKpis, 2),
        usedPct: round((monthKpis / amount) * 100, 1),
        projection: round(projection, 2),
        status: monthKpis > amount ? 'exceeded' : projection > amount ? 'at_risk' : 'on_track',
      };
    }

    const anomaliesOpen = await this.anomaliesRepo.find({
      where: { userId, resolvedAt: IsNull() },
      relations: { meter: true },
      order: { detectedAt: 'DESC' },
      take: 5,
    });

    const recent = await this.readingsRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.meter', 'meter')
      .where('meter.userId = :userId', { userId })
      .orderBy('r.periodStart', 'DESC')
      .take(8)
      .getMany();

    const user = await this.usersRepo.findOne({ where: { id: userId } });

    return {
      kpis,
      budgetGlobal,
      anomaliesOpen,
      recentReadings: recent.map((r) => ({
        id: r.id,
        meterId: r.meterId,
        meterName: r.meter.name,
        utility: r.meter.utilityType,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        value: Number(r.value),
        unit: UTILITY_UNITS[r.meter.utilityType],
        source: r.source,
      })),
      currency: user?.currency ?? 'EUR',
    };
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
