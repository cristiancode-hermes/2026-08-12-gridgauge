import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meter } from '../entities/meter.entity';
import { Tariff } from '../entities/tariff.entity';
import { CreateTariffDto, UpdateTariffDto } from '../dto/api.dto';
import { PeakOffPeak, Tier, UtilityType } from '../common/types';

export interface CostBreakdown {
  variable: number;
  fixedFee: number;
  total: number;
  tiersApplied: { label: string; cost: number }[];
  peakOffPeakApplied: { peakUnits: number; offPeakUnits: number; peakCost: number; offPeakCost: number } | null;
}

@Injectable()
export class TariffService {
  constructor(
    @InjectRepository(Tariff) private readonly tariffsRepo: Repository<Tariff>,
    @InjectRepository(Meter) private readonly metersRepo: Repository<Meter>,
  ) {}

  async list(userId: string) {
    const tariffs = await this.tariffsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const meters = await this.metersRepo.find({ where: { userId, active: true } });
    return tariffs.map((t) => ({
      ...t,
      inUse: meters.some((m) => m.tariffId === t.id),
      meterCount: meters.filter((m) => m.tariffId === t.id).length,
    }));
  }

  async findOne(userId: string, id: string): Promise<Tariff> {
    const tariff = await this.tariffsRepo.findOne({ where: { id, userId } });
    if (!tariff) throw new NotFoundException('TARIFF_NOT_FOUND');
    return tariff;
  }

  async create(userId: string, dto: CreateTariffDto): Promise<Tariff> {
    this.validateTariff(dto);
    const tariff = this.tariffsRepo.create({
      userId,
      name: dto.name,
      utilityType: dto.utilityType,
      unitPrice: dto.unitPrice,
      fixedFee: dto.fixedFee ?? 0,
      tiers: dto.tiers ?? null,
      peakOffPeak: dto.peakOffPeak ?? null,
      active: dto.active ?? true,
    } as any);
    return (await this.tariffsRepo.save(tariff)) as unknown as Tariff;
  }

  async update(userId: string, id: string, dto: UpdateTariffDto): Promise<Tariff> {
    const tariff = await this.findOne(userId, id);
    this.validateTariff({ ...tariff, ...dto } as CreateTariffDto);
    if (dto.name !== undefined) tariff.name = dto.name;
    if (dto.unitPrice !== undefined) tariff.unitPrice = dto.unitPrice;
    if (dto.fixedFee !== undefined) tariff.fixedFee = dto.fixedFee;
    if (dto.tiers !== undefined) tariff.tiers = dto.tiers;
    if (dto.peakOffPeak !== undefined) tariff.peakOffPeak = dto.peakOffPeak;
    if (dto.active !== undefined) tariff.active = dto.active;
    return (await this.tariffsRepo.save(tariff)) as unknown as Tariff;
  }

  async remove(userId: string, id: string): Promise<void> {
    const tariff = await this.findOne(userId, id);
    const meters = await this.metersRepo.find({ where: { tariffId: id } });
    if (meters.length > 0) {
      throw new ConflictException('TARIFF_IN_USE');
    }
    await this.tariffsRepo.delete({ id: tariff.id });
  }

  async duplicate(userId: string, id: string): Promise<Tariff> {
    const tariff = await this.findOne(userId, id);
    const copy = this.tariffsRepo.create({
      userId,
      name: `${tariff.name} (copia)`,
      utilityType: tariff.utilityType,
      unitPrice: tariff.unitPrice,
      fixedFee: tariff.fixedFee,
      tiers: tariff.tiers ? JSON.parse(JSON.stringify(tariff.tiers)) : null,
      peakOffPeak: tariff.peakOffPeak ? JSON.parse(JSON.stringify(tariff.peakOffPeak)) : null,
      active: true,
    } as any);
    return (await this.tariffsRepo.save(copy)) as unknown as Tariff;
  }

  private validateTariff(dto: CreateTariffDto) {
    if (dto.unitPrice < 0) throw new BadRequestException('unitPrice must be >= 0');
    if ((dto.fixedFee ?? 0) < 0) throw new BadRequestException('fixedFee must be >= 0');
    if (dto.tiers && dto.tiers.length > 0) {
      let prevUpTo = -Infinity;
      for (const tier of dto.tiers) {
        if (tier.price <= 0) throw new BadRequestException('TIER_PRICE_INVALID');
        if (tier.upTo !== undefined && tier.upTo <= prevUpTo) {
          throw new BadRequestException('TIER_LIMITS_NOT_INCREASING');
        }
        prevUpTo = tier.upTo ?? Infinity;
      }
    }
    if (dto.peakOffPeak && dto.peakOffPeak.enabled) {
      const p = dto.peakOffPeak;
      if (!p.peakHours || p.peakHours.length === 0) {
        throw new BadRequestException('PEAK_HOURS_REQUIRED');
      }
      for (const [start, end] of p.peakHours) {
        if (start === end) throw new BadRequestException('PEAK_WINDOW_INVALID');
        if (start < 0 || start > 23 || end < 0 || end > 23) {
          throw new BadRequestException('PEAK_HOUR_OUT_OF_RANGE');
        }
      }
      if (p.peakPrice < 0 || p.offPeakPrice < 0) {
        throw new BadRequestException('PEAK_PRICE_INVALID');
      }
    }
  }

  /**
   * Calcula el coste de N unidades consumidas en un periodo concreto.
   * Prioridad: tramos progresivos (si existen) > discriminación horaria (si enabled) > unit_price.
   * La cuota fija NO se incluye aquí (se añade por mes natural con lecturas en monthCost).
   */
  calculateCost(
    tariff: Tariff,
    units: number,
    periodStart: Date,
    periodEnd: Date,
  ): CostBreakdown {
    const breakdown: CostBreakdown = {
      variable: 0,
      fixedFee: 0,
      total: 0,
      tiersApplied: [],
      peakOffPeakApplied: null,
    };

    if (units <= 0) return breakdown;

    if (tariff.tiers && tariff.tiers.length > 0) {
      breakdown.variable = this.costWithTiers(tariff.tiers, units, breakdown.tiersApplied);
    } else if (tariff.peakOffPeak && tariff.peakOffPeak.enabled) {
      const frac = this.peakFraction(tariff.peakOffPeak, periodStart, periodEnd);
      const peakUnits = units * frac;
      const offPeakUnits = units * (1 - frac);
      const peakCost = peakUnits * tariff.peakOffPeak.peakPrice;
      const offPeakCost = offPeakUnits * tariff.peakOffPeak.offPeakPrice;
      breakdown.variable = peakCost + offPeakCost;
      breakdown.peakOffPeakApplied = {
        peakUnits: round(peakUnits, 3),
        offPeakUnits: round(offPeakUnits, 3),
        peakCost: round(peakCost, 2),
        offPeakCost: round(offPeakCost, 2),
      };
    } else {
      breakdown.variable = units * tariff.unitPrice;
    }

    breakdown.variable = round(breakdown.variable, 2);
    breakdown.total = round(breakdown.variable + breakdown.fixedFee, 2);
    return breakdown;
  }

  /** Coste con tramos progresivos sobre consumo acumulado (todas las lecturas del mes en orden). */
  calculateMonthCostWithTiers(tariff: Tariff, monthlyUnits: number): CostBreakdown {
    const breakdown: CostBreakdown = {
      variable: 0,
      fixedFee: 0,
      total: 0,
      tiersApplied: [],
      peakOffPeakApplied: null,
    };
    breakdown.variable = round(this.costWithTiers(tariff.tiers ?? [], monthlyUnits, breakdown.tiersApplied), 2);
    breakdown.total = round(breakdown.variable, 2);
    return breakdown;
  }

  private costWithTiers(tiers: Tier[], units: number, applied: { label: string; cost: number }[]): number {
    let remaining = units;
    let cost = 0;
    let prevLimit = 0;
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const upper = tier.upTo ?? Infinity;
      const inTier = Math.max(0, Math.min(remaining, upper - prevLimit));
      const tierCost = inTier * tier.price;
      cost += tierCost;
      if (inTier > 0) {
        applied.push({
          label: tier.upTo === undefined ? `> ${prevLimit}` : `${prevLimit + 1}–${tier.upTo}`,
          cost: round(tierCost, 2),
        });
      }
      remaining -= inTier;
      prevLimit = upper;
      if (remaining <= 0) break;
    }
    return cost;
  }

  /** Fracción de horas punta en [start, end). Ventanas [inicio, fin) que cruzan medianoche (ej [23,7)). */
  peakFraction(peak: PeakOffPeak, start: Date, end: Date): number {
    const totalMs = end.getTime() - start.getTime();
    if (totalMs <= 0) return 0;
    let peakMs = 0;
    const DAY = 24 * 60 * 60 * 1000;
    // Recorre el periodo en tramos de <= 1 día para resolver ventanas que cruzan medianoche
    let cursor = start.getTime();
    while (cursor < end.getTime()) {
      const segEnd = Math.min(cursor + DAY, end.getTime());
      for (const [phStart, phEnd] of peak.peakHours) {
        const crossesMidnight = phEnd < phStart;
        // Iterar horas del día
        const dayStart = new Date(cursor);
        const dayEnd = new Date(segEnd);
        const h0 = dayStart.getHours() + dayStart.getMinutes() / 60;
        const h1 = dayEnd.getHours() + dayEnd.getMinutes() / 60 + (dayEnd.getDate() !== dayStart.getDate() ? 24 : 0);
        for (let h = Math.floor(h0); h < Math.ceil(h1); h++) {
          const windowHour = ((h % 24) + 24) % 24;
          const inPeak = crossesMidnight
            ? windowHour >= phStart || windowHour < phEnd
            : windowHour >= phStart && windowHour < phEnd;
          if (inPeak) {
            const overlapStart = Math.max(h, h0);
            const overlapEnd = Math.min(h + 1, h1);
            peakMs += Math.max(0, overlapEnd - overlapStart) * 3600 * 1000;
          }
        }
      }
      cursor = segEnd;
    }
    return Math.min(1, peakMs / totalMs);
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
