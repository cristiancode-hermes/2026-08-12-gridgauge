import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Anomaly } from '../entities/anomaly.entity';
import { Budget } from '../entities/budget.entity';
import { Device } from '../entities/device.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { Tariff } from '../entities/tariff.entity';
import { User } from '../entities/user.entity';
import { DEFAULT_CO2_FACTORS, DEFAULT_PREFS } from '../common/types';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Meter) private readonly metersRepo: Repository<Meter>,
    @InjectRepository(Reading) private readonly readingsRepo: Repository<Reading>,
    @InjectRepository(Tariff) private readonly tariffsRepo: Repository<Tariff>,
    @InjectRepository(Budget) private readonly budgetsRepo: Repository<Budget>,
    @InjectRepository(Anomaly) private readonly anomaliesRepo: Repository<Anomaly>,
    @InjectRepository(Device) private readonly devicesRepo: Repository<Device>,
  ) {}

  async onModuleInit() {
    if (!this.config.get<string>('SEED_DB')) return;
    await this.seed();
  }

  async seed() {
    const existing = await this.usersRepo.count();
    if (existing > 0) {
      this.logger.log('Seed skip: users already exist');
      return;
    }
    this.logger.log('Seeding GridGauge demo data...');

    // --- Usuario demo ---
    const passwordHash = await bcrypt.hash('demo1234', 10);
    const user = this.usersRepo.create({
      email: 'casa@gridgauge.dev',
      passwordHash,
      displayName: 'Mi hogar',
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      co2Factors: DEFAULT_CO2_FACTORS,
      prefs: DEFAULT_PREFS,
    } as any);
    const savedUser = (await this.usersRepo.save(user)) as unknown as User;

    // --- Tarifas ---
    // 1) Electricidad con tramos progresivos
    const tariffElec = this.tariffsRepo.create({
      userId: savedUser.id,
      name: 'Hogar 2.0 TD',
      utilityType: 'electricity',
      currency: 'EUR',
      unitPrice: 0.15,
      fixedFee: 3.1,
      tiers: [
        { upTo: 100, price: 0.15 },
        { upTo: 250, price: 0.17 },
        { price: 0.2 },
      ],
      peakOffPeak: null,
      active: true,
    } as any);
    const savedTariffElec = (await this.tariffsRepo.save(tariffElec)) as unknown as Tariff;

    // 2) Agua con tarifa plana
    const tariffWater = this.tariffsRepo.create({
      userId: savedUser.id,
      name: 'Agua municipal',
      utilityType: 'water',
      currency: 'EUR',
      unitPrice: 1.63,
      fixedFee: 2.4,
      tiers: null,
      peakOffPeak: null,
      active: true,
    } as any);
    const savedTariffWater = (await this.tariffsRepo.save(tariffWater)) as unknown as Tariff;

    // 3) Gas con discriminación horaria (punta [23,7))
    const tariffGas = this.tariffsRepo.create({
      userId: savedUser.id,
      name: 'Gas natural PVPC',
      utilityType: 'gas',
      currency: 'EUR',
      unitPrice: 0.74,
      fixedFee: 4.2,
      tiers: null,
      peakOffPeak: {
        enabled: true,
        peakHours: [[23, 7]],
        peakPrice: 0.84,
        offPeakPrice: 0.61,
      },
      active: true,
    } as any);
    const savedTariffGas = (await this.tariffsRepo.save(tariffGas)) as unknown as Tariff;

    // --- Contadores ---
    const meterElec = this.metersRepo.create({
      userId: savedUser.id,
      tariffId: savedTariffElec.id,
      name: 'Contador principal',
      utilityType: 'electricity',
      location: 'Cocina',
      serialNumber: 'ES-1001-2204-8890',
      active: true,
    } as any);
    const savedMeterElec = (await this.metersRepo.save(meterElec)) as unknown as Meter;

    const meterWater = this.metersRepo.create({
      userId: savedUser.id,
      tariffId: savedTariffWater.id,
      name: 'Contador del jardín',
      utilityType: 'water',
      location: 'Jardín',
      serialNumber: 'ES-2003-7741-112',
      active: true,
    } as any);
    const savedMeterWater = (await this.metersRepo.save(meterWater)) as unknown as Meter;

    const meterGas = this.metersRepo.create({
      userId: savedUser.id,
      tariffId: savedTariffGas.id,
      name: 'Caldera',
      utilityType: 'gas',
      location: 'Cuarto de instalaciones',
      serialNumber: 'ES-3008-5520-331',
      active: true,
    } as any);
    const savedMeterGas = (await this.metersRepo.save(meterGas)) as unknown as Meter;

    // --- 90 días de lecturas diarias ---
    const now = new Date();
    // electricidad: 8-14 kWh/día con picos de fin de semana (ayer se inyecta el pico aparte)
    for (let i = 89; i >= 0; i--) {
      if (i === 1) continue; // ayer = lectura de pico (spike) inyectada después
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const dow = day.getDay();
      const base = dow === 0 || dow === 6 ? 12.4 : 9.6;
      const noise = (Math.sin(i * 1.7) + 1) * 1.4;
      const value = round(base + noise + (i % 7 === 3 ? 2.6 : 0), 3);
      const end = new Date(day);
      end.setHours(23, 59, 0, 0);
      const reading = this.readingsRepo.create({
        meterId: savedMeterElec.id,
        periodStart: day,
        periodEnd: end,
        value,
        source: i < 5 ? 'manual' : 'import',
        notes: i < 5 ? 'Lectura semanal' : null,
      } as any);
      await this.readingsRepo.save(reading);
    }
    // agua: 0.3-0.6 m³/día
    for (let i = 89; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const dow = day.getDay();
      const value = round((dow === 0 || dow === 6 ? 0.48 : 0.36) + (i % 5 === 2 ? 0.12 : 0), 3);
      const end = new Date(day);
      end.setHours(23, 59, 0, 0);
      const reading = this.readingsRepo.create({
        meterId: savedMeterWater.id,
        periodStart: day,
        periodEnd: end,
        value,
        source: 'import',
        notes: null,
      } as any);
      await this.readingsRepo.save(reading);
    }
    // gas: 1.0-3.2 m³/día (más en invierno = hace 90 días)
    for (let i = 89; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const seasonal = 2.6 - (i / 90) * 1.2;
      const value = round(Math.max(0.9, seasonal + (i % 6 === 4 ? 0.7 : 0)), 3);
      const end = new Date(day);
      end.setHours(23, 59, 0, 0);
      const reading = this.readingsRepo.create({
        meterId: savedMeterGas.id,
        periodStart: day,
        periodEnd: end,
        value,
        source: 'import',
        notes: null,
      } as any);
      await this.readingsRepo.save(reading);
    }

    // --- Pico inyectado: lectura de ayer un +40% (dispara anomalía spike) ---
    const spikeDay = new Date(now);
    spikeDay.setDate(now.getDate() - 1);
    spikeDay.setHours(0, 0, 0, 0);
    const spikeEnd = new Date(spikeDay);
    spikeEnd.setHours(23, 59, 0, 0);
    const spikeReading = this.readingsRepo.create({
      meterId: savedMeterElec.id,
      periodStart: spikeDay,
      periodEnd: spikeEnd,
      value: 17.9,
      source: 'manual',
      notes: 'Aire acondicionado + lavadora',
    } as any);
    const savedSpike = (await this.readingsRepo.save(spikeReading)) as unknown as Reading;

    // --- Anomalías: 1 spike abierta + 1 no_data resuelta ---
    const anomalyOpen = this.anomaliesRepo.create({
      userId: savedUser.id,
      meterId: savedMeterElec.id,
      readingId: savedSpike.id,
      type: 'spike',
      severity: 'warning',
      detectedAt: new Date(),
      expectedValue: 11.2,
      actualValue: 17.9,
      deviationPct: 59.8,
      resolvedAt: null,
      note: null,
    } as any);
    await this.anomaliesRepo.save(anomalyOpen);

    const anomalyResolved = this.anomaliesRepo.create({
      userId: savedUser.id,
      meterId: savedMeterWater.id,
      readingId: null,
      type: 'no_data',
      severity: 'warning',
      detectedAt: new Date(Date.now() - 5 * 86400000),
      expectedValue: null,
      actualValue: null,
      deviationPct: null,
      resolvedAt: new Date(Date.now() - 4 * 86400000),
      note: 'Contador reemplazado',
    } as any);
    await this.anomaliesRepo.save(anomalyResolved);

    // --- Presupuesto de agosto 2026 ---
    const budget = this.budgetsRepo.create({
      userId: savedUser.id,
      meterId: savedMeterElec.id,
      period: '2026-08-01',
      amount: 60,
    } as any);
    await this.budgetsRepo.save(budget);

    // --- Dispositivos estimados ---
    const devices = [
      { name: 'Frigorífico', wattage: 150, hoursPerDay: 7.5 },
      { name: 'Televisión', wattage: 120, hoursPerDay: 4 },
      { name: 'Router + WiFi', wattage: 15, hoursPerDay: 24 },
      { name: 'Lavadora', wattage: 1500, hoursPerDay: 0.5 },
    ];
    for (const d of devices) {
      const device = this.devicesRepo.create({
        userId: savedUser.id,
        meterId: savedMeterElec.id,
        name: d.name,
        wattage: d.wattage,
        hoursPerDay: d.hoursPerDay,
        active: true,
      } as any);
      await this.devicesRepo.save(device);
    }

    this.logger.log('Seed complete: 1 user, 3 meters, 3 tariffs, ~270 readings, 2 anomalies, 1 budget, 4 devices');
    this.logger.log('Login: casa@gridgauge.dev / demo1234');
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
