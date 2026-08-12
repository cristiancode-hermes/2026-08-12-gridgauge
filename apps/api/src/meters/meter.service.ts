import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { Tariff } from '../entities/tariff.entity';
import { Anomaly } from '../entities/anomaly.entity';
import { Budget } from '../entities/budget.entity';
import { CreateMeterDto, CreateReadingDto, UpdateMeterDto } from '../dto/api.dto';
import { TariffService } from '../tariffs/tariff.service';
import { UTILITY_UNITS } from '../common/types';
import { AnomalyDetectorService } from '../anomalies/anomaly-detector.service';

@Injectable()
export class MeterService {
  constructor(
    @InjectRepository(Meter) private readonly metersRepo: Repository<Meter>,
    @InjectRepository(Reading) private readonly readingsRepo: Repository<Reading>,
    @InjectRepository(Tariff) private readonly tariffsRepo: Repository<Tariff>,
    @InjectRepository(Anomaly) private readonly anomaliesRepo: Repository<Anomaly>,
    private readonly dataSource: DataSource,
    private readonly tariffService: TariffService,
    private readonly anomalyDetector: AnomalyDetectorService,
  ) {}

  async list(userId: string) {
    const meters = await this.metersRepo.find({
      where: { userId },
      relations: { tariff: true },
      order: { createdAt: 'DESC' },
    });
    const result: any[] = [];
    for (const meter of meters) {
      result.push(await this.decorate(meter, userId));
    }
    return result;
  }

  async findOwned(userId: string, id: string): Promise<Meter> {
    const meter = await this.metersRepo.findOne({
      where: { id, userId },
      relations: { tariff: true },
    });
    if (!meter) throw new NotFoundException('METER_NOT_FOUND');
    return meter;
  }

  async getDetail(userId: string, id: string) {
    const meter = await this.findOwned(userId, id);
    return this.decorate(meter, userId);
  }

  async create(userId: string, dto: CreateMeterDto): Promise<Meter> {
    if (dto.tariffId) {
      const tariff = await this.tariffsRepo.findOne({ where: { id: dto.tariffId, userId } });
      if (!tariff) throw new BadRequestException('TARIFF_NOT_FOUND');
    }
    const meter = this.metersRepo.create({
      userId,
      name: dto.name,
      utilityType: dto.utilityType,
      location: dto.location ?? null,
      serialNumber: dto.serialNumber ?? null,
      tariffId: dto.tariffId ?? null,
      active: dto.active ?? true,
    } as any);
    return (await this.metersRepo.save(meter)) as unknown as Meter;
  }

  async update(userId: string, id: string, dto: UpdateMeterDto): Promise<Meter> {
    const meter = await this.findOwned(userId, id);
    if (dto.name !== undefined) meter.name = dto.name;
    if (dto.location !== undefined) meter.location = dto.location;
    if (dto.active !== undefined) meter.active = dto.active;
    if (dto.tariffId !== undefined) {
      if (dto.tariffId === null) {
        meter.tariffId = null;
      } else {
        const tariff = await this.tariffsRepo.findOne({ where: { id: dto.tariffId, userId } });
        if (!tariff) throw new BadRequestException('TARIFF_NOT_FOUND');
        meter.tariffId = dto.tariffId;
      }
    }
    const saved = (await this.metersRepo.save(meter)) as unknown as Meter;
    return this.decorate(saved, userId);
  }

  async remove(userId: string, id: string): Promise<void> {
    const meter = await this.findOwned(userId, id);
    await this.metersRepo.delete({ id: meter.id });
  }

  // ---- Readings ----

  async listReadings(userId: string, meterId: string, page = 1, limit = 25, from?: string, to?: string) {
    await this.findOwned(userId, meterId);
    const qb = this.readingsRepo.createQueryBuilder('r')
      .where('r.meterId = :meterId', { meterId });
    if (from) qb.andWhere('r.periodStart >= :from', { from: new Date(from) });
    if (to) qb.andWhere('r.periodStart < :to', { to: new Date(to) });
    const [items, total] = await qb
      .orderBy('r.periodStart', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total };
  }

  async createReading(userId: string, meterId: string, dto: CreateReadingDto): Promise<Reading> {
    const meter = await this.findOwned(userId, meterId);
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new BadRequestException('INVALID_DATE');
    }
    if (periodEnd <= periodStart) {
      throw new BadRequestException('PERIOD_END_BEFORE_START');
    }
    if (dto.value <= 0) {
      throw new BadRequestException('VALUE_MUST_BE_POSITIVE');
    }
    const dup = await this.readingsRepo.findOne({ where: { meterId, periodStart } });
    if (dup) {
      throw new ConflictException('PERIOD_DUPLICATE');
    }
    const reading = this.readingsRepo.create({
      meterId,
      periodStart,
      periodEnd,
      value: dto.value,
      source: 'manual',
      notes: dto.notes ?? null,
    } as any);
    const saved = (await this.readingsRepo.save(reading)) as unknown as Reading;
    // Auto-resuelve no_data abiertas + detecta anomalías
    await this.anomalyDetector.onReadingCreated(userId, meter, saved);
    return saved;
  }

  async bulkImportCsv(userId: string, meterId: string, csv: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const meter = await this.findOwned(userId, meterId);
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 500) throw new BadRequestException('CSV_TOO_LARGE');
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;
    const existing = await this.readingsRepo.find({ where: { meterId }, select: { periodStart: true } });
    const existingKeys = new Set(existing.map((r) => new Date(r.periodStart).toISOString()));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(',').map((c) => c.trim());
      if (i === 0 && cols[0].toLowerCase() === 'period_start') continue; // cabecera
      if (cols.length < 3) {
        errors.push(`Fila ${i + 1}: formato inválido`);
        skipped++;
        continue;
      }
      const [ps, pe, v] = cols;
      const periodStart = new Date(ps);
      const periodEnd = new Date(pe);
      const value = Number(v);
      if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
        errors.push(`Fila ${i + 1}: fecha inválida`);
        skipped++;
        continue;
      }
      if (periodEnd <= periodStart) {
        errors.push(`Fila ${i + 1}: fin anterior al inicio`);
        skipped++;
        continue;
      }
      if (!isFinite(value) || value <= 0) {
        errors.push(`Fila ${i + 1}: valor inválido`);
        skipped++;
        continue;
      }
      const key = periodStart.toISOString();
      if (existingKeys.has(key)) {
        skipped++;
        continue; // duplicada, se omite silenciosamente
      }
      const reading = this.readingsRepo.create({
        meterId,
        periodStart,
        periodEnd,
        value,
        source: 'import',
        notes: null,
      } as any);
      await this.readingsRepo.save(reading);
      existingKeys.add(key);
      imported++;
    }
    if (imported > 0) {
      await this.anomalyDetector.detectMeter(userId, meter);
    }
    return { imported, skipped, errors };
  }

  async removeReading(userId: string, readingId: string): Promise<void> {
    const reading = await this.readingsRepo.findOne({ where: { id: readingId }, relations: { meter: true } });
    if (!reading || reading.meter.userId !== userId) {
      throw new NotFoundException('READING_NOT_FOUND');
    }
    await this.readingsRepo.delete({ id: readingId });
  }

  // ---- Series & stats ----

  async series(userId: string, meterId: string, bucket: 'day' | 'week' | 'month' | 'year', from: string, to: string) {
    const meter = await this.findOwned(userId, meterId);
    const fromDate = new Date(from || new Date(Date.now() - 30 * 86400000).toISOString());
    const toDate = new Date(to || new Date().toISOString());
    const unit = UTILITY_UNITS[meter.utilityType];

    const raw = await this.readingsRepo
      .createQueryBuilder('r')
      .select('r.periodStart', 'periodStart')
      .addSelect('SUM(r.value)', 'value')
      .where('r.meterId = :meterId', { meterId })
      .andWhere('r.periodStart >= :from', { from: fromDate })
      .andWhere('r.periodStart < :to', { to: toDate })
      .groupBy('r.periodStart')
      .orderBy('r.periodStart', 'ASC')
      .getRawMany();

    const map = new Map<string, number>();
    for (const row of raw) {
      const d = new Date(row.periodStart);
      const key = this.bucketKey(d, bucket);
      map.set(key, (map.get(key) ?? 0) + Number(row.value));
    }

    const points: any[] = [];
    const cursor = new Date(fromDate);
    while (cursor < toDate) {
      const key = this.bucketKey(cursor, bucket);
      points.push({
        date: key,
        value: round((map.get(key) ?? 0), 3),
      });
      this.advance(cursor, bucket);
    }
    return { points, unit };
  }

  async stats(userId: string, meterId: string, period: string) {
    const meter = await this.findOwned(userId, meterId);
    const [year, month] = period.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));
    const prevStart = new Date(Date.UTC(year, month - 2, 1));
    const prevEnd = monthStart;

    // Lecturas del mes (query directa para evitar where con objetos Date inconsistentes)
    const cur = await this.readingsRepo.createQueryBuilder('r')
      .where('r.meterId = :meterId', { meterId })
      .andWhere('r.periodStart >= :s', { s: monthStart })
      .andWhere('r.periodStart < :e', { e: monthEnd })
      .orderBy('r.periodStart', 'ASC')
      .getMany();
    const prev = await this.readingsRepo.createQueryBuilder('r')
      .where('r.meterId = :meterId', { meterId })
      .andWhere('r.periodStart >= :s', { s: prevStart })
      .andWhere('r.periodStart < :e', { e: prevEnd })
      .getMany();

    const consumption = round(cur.reduce((a, r) => a + Number(r.value), 0), 3);
    const prevConsumption = round(prev.reduce((a, r) => a + Number(r.value), 0), 3);

    let cost = 0;
    let prevCost = 0;
    if (meter.tariff) {
      cost = this.monthCostWithTariff(meter.tariff, cur, monthStart);
      prevCost = this.monthCostWithTariff(meter.tariff, prev, prevStart);
    }

    const deltaPct = prevConsumption > 0 ? round(((consumption - prevConsumption) / prevConsumption) * 100, 1) : null;

    return {
      period,
      consumption,
      cost: round(cost, 2),
      prevPeriod: prevConsumption,
      prevCost: round(prevCost, 2),
      deltaPct,
      unit: UTILITY_UNITS[meter.utilityType],
    };
  }

  private monthCostWithTariff(tariff: Tariff, readings: Reading[], monthStart: Date): number {
    let total = 0;
    const monthlyUnits = readings.reduce((a, r) => a + Number(r.value), 0);
    for (const r of readings) {
      total += this.tariffService.calculateCost(tariff, Number(r.value), r.periodStart, r.periodEnd).variable;
    }
    // Cuota fija una vez por mes natural con >= 1 lectura
    if (readings.length > 0) total += Number(tariff.fixedFee);
    void monthStart;
    void monthlyUnits;
    return total;
  }

  private async decorate(meter: Meter, userId: string) {
    const unit = UTILITY_UNITS[meter.utilityType];
    const last = await this.readingsRepo.findOne({
      where: { meterId: meter.id },
      order: { periodStart: 'DESC' },
    });
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthAgg = await this.readingsRepo.createQueryBuilder('r')
      .select('COALESCE(SUM(r.value), 0)', 'total')
      .where('r.meterId = :meterId', { meterId: meter.id })
      .andWhere('r.periodStart >= :s', { s: monthStart })
      .getRawOne();
    const openAnomalies = await this.anomaliesRepo.count({ where: { meterId: meter.id, resolvedAt: IsNull() } });
    let monthCost = 0;
    if (meter.tariff) {
      const cur = await this.readingsRepo.createQueryBuilder('r')
        .where('r.meterId = :meterId', { meterId: meter.id })
        .andWhere('r.periodStart >= :s', { s: monthStart })
        .getMany();
      monthCost = this.monthCostWithTariff(meter.tariff, cur, monthStart);
    }
    return {
      ...meter,
      unit,
      lastReading: last ? { periodStart: last.periodStart, value: Number(last.value) } : null,
      monthConsumption: round(Number(monthAgg?.total ?? 0), 3),
      monthCost: round(monthCost, 2),
      openAnomalies,
    };
  }

  private bucketKey(d: Date, bucket: string): string {
    if (bucket === 'day') return d.toISOString().slice(0, 10);
    if (bucket === 'week') {
      const day = (d.getUTCDay() + 6) % 7; // lunes = 0
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - day);
      return monday.toISOString().slice(0, 10);
    }
    if (bucket === 'month') return d.toISOString().slice(0, 7);
    return d.toISOString().slice(0, 4);
  }

  private advance(d: Date, bucket: string) {
    if (bucket === 'day') d.setUTCDate(d.getUTCDate() + 1);
    else if (bucket === 'week') d.setUTCDate(d.getUTCDate() + 7);
    else if (bucket === 'month') d.setUTCMonth(d.getUTCMonth() + 1);
    else d.setUTCFullYear(d.getUTCFullYear() + 1);
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
