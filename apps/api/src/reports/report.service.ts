import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { Tariff } from '../entities/tariff.entity';
import { User } from '../entities/user.entity';
import { TariffService } from '../tariffs/tariff.service';
import { UTILITY_LABELS, UTILITY_UNITS } from '../common/types';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Meter) private readonly metersRepo: Repository<Meter>,
    @InjectRepository(Reading) private readonly readingsRepo: Repository<Reading>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly tariffService: TariffService,
  ) {}

  async monthlyReport(userId: string, year: number, month: number) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));
    const prevYearStart = new Date(Date.UTC(year - 1, month - 1, 1));
    const prevYearEnd = new Date(Date.UTC(year - 1, month, 1));

    const meters = await this.metersRepo.find({ where: { userId }, relations: { tariff: true } });
    const byUtility: any[] = [];
    let totalConsumption = 0;
    let totalCost = 0;
    let co2 = 0;

    for (const meter of meters) {
      const cur = await this.readingsRepo.createQueryBuilder('r')
        .where('r.meterId = :meterId', { meterId: meter.id })
        .andWhere('r.periodStart >= :s', { s: monthStart })
        .andWhere('r.periodStart < :e', { e: monthEnd })
        .orderBy('r.periodStart', 'ASC')
        .getMany();
      const prevYear = await this.readingsRepo.createQueryBuilder('r')
        .where('r.meterId = :meterId', { meterId: meter.id })
        .andWhere('r.periodStart >= :s', { s: prevYearStart })
        .andWhere('r.periodStart < :e', { e: prevYearEnd })
        .getMany();

      const consumption = round(cur.reduce((a, r) => a + Number(r.value), 0), 3);
      let cost = 0;
      if (meter.tariff) {
        for (const r of cur) {
          cost += this.tariffService.calculateCost(meter.tariff, Number(r.value), r.periodStart, r.periodEnd).variable;
        }
        if (cur.length > 0) cost += Number(meter.tariff.fixedFee);
      }
      const prevYearConsumption = round(prevYear.reduce((a, r) => a + Number(r.value), 0), 3);
      const factor = user?.co2Factors?.[meter.utilityType] ?? 0;
      const meterCo2 = consumption * factor;

      totalConsumption += consumption;
      totalCost += cost;
      co2 += meterCo2;

      byUtility.push({
        utility: meter.utilityType,
        label: UTILITY_LABELS[meter.utilityType],
        unit: UTILITY_UNITS[meter.utilityType],
        meterId: meter.id,
        meterName: meter.name,
        consumption,
        cost: round(cost, 2),
        prevYearConsumption,
        deltaPct:
          prevYearConsumption > 0
            ? round(((consumption - prevYearConsumption) / prevYearConsumption) * 100, 1)
            : null,
        co2: round(meterCo2, 2),
        readingCount: cur.length,
      });
    }

    // YoY mensual: serie por utility comparando el mes
    const yoy = byUtility
      .filter((u) => u.prevYearConsumption > 0)
      .map((u) => ({
        utility: u.utility,
        label: u.label,
        current: u.consumption,
        prevYear: u.prevYearConsumption,
        deltaPct: u.deltaPct,
      }));

    return {
      year,
      month,
      monthLabel: `${year}-${String(month).padStart(2, '0')}`,
      totalConsumption: round(totalConsumption, 3),
      totalCost: round(totalCost, 2),
      co2: round(co2, 2),
      currency: user?.currency ?? 'EUR',
      byUtility,
      yoy,
      dataSince: year,
    };
  }

  async exportCsv(userId: string, year: number, month: number): Promise<string> {
    const report = await this.monthlyReport(userId, year, month);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));
    const meters = await this.metersRepo.find({ where: { userId }, relations: { tariff: true } });

    const rows: string[] = ['utility,meter,period_start,period_end,value,cost'];
    for (const meter of meters) {
      const cur = await this.readingsRepo.createQueryBuilder('r')
        .where('r.meterId = :meterId', { meterId: meter.id })
        .andWhere('r.periodStart >= :s', { s: monthStart })
        .andWhere('r.periodStart < :e', { e: monthEnd })
        .orderBy('r.periodStart', 'ASC')
        .getMany();
      for (const r of cur) {
        let cost = 0;
        if (meter.tariff) {
          cost = this.tariffService.calculateCost(meter.tariff, Number(r.value), r.periodStart, r.periodEnd).variable;
        }
        rows.push(
          [
            meter.utilityType,
            meter.name.replace(/,/g, ' '),
            new Date(r.periodStart).toISOString(),
            new Date(r.periodEnd).toISOString(),
            Number(r.value),
            cost.toFixed(2),
          ].join(','),
        );
      }
    }
    // BOM para Excel/LibreOffice
    return '\uFEFF' + rows.join('\n') + '\n';
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
