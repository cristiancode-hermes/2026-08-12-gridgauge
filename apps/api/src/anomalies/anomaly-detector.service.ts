import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Anomaly } from '../entities/anomaly.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { User } from '../entities/user.entity';
import { AnomalySeverity, AnomalyType, UTILITY_UNITS } from '../common/types';

export interface DetectResult {
  created: number;
  escalated: number;
  autoResolved: number;
}

@Injectable()
export class AnomalyDetectorService {
  constructor(
    @InjectRepository(Anomaly) private readonly anomaliesRepo: Repository<Anomaly>,
    @InjectRepository(Meter) private readonly metersRepo: Repository<Meter>,
    @InjectRepository(Reading) private readonly readingsRepo: Repository<Reading>,
  ) {}

  async onReadingCreated(userId: string, meter: Meter, reading: Reading): Promise<DetectResult> {
    // Auto-resuelve no_data abiertas
    let autoResolved = 0;
    const openNoData = await this.anomaliesRepo.find({
      where: { meterId: meter.id, type: 'no_data', resolvedAt: IsNull() },
    });
    for (const an of openNoData) {
      an.resolvedAt = new Date();
      an.note = 'Lectura recibida';
      await this.anomaliesRepo.save(an);
      autoResolved++;
    }
    const spikeResult = await this.detectSpike(userId, meter, reading);
    return {
      created: spikeResult.created,
      escalated: spikeResult.escalated,
      autoResolved,
    };
  }

  async detectMeter(userId: string, meter: Meter): Promise<DetectResult> {
    const result: DetectResult = { created: 0, escalated: 0, autoResolved: 0 };
    if (!meter.active) return result;
    const readings = await this.readingsRepo.find({
      where: { meterId: meter.id },
      order: { periodStart: 'ASC' },
    });
    if (readings.length === 0) return result;
    const last = readings[readings.length - 1];
    const spike = await this.detectSpike(userId, meter, last);
    result.created += spike.created;
    result.escalated += spike.escalated;
    const sustained = await this.detectSustainedHigh(userId, meter, readings);
    result.created += sustained;
    const noData = await this.detectNoData(userId, meter, readings);
    result.created += noData.created;
    result.escalated += noData.escalated;
    const leak = await this.detectLeak(userId, meter, readings);
    result.created += leak;
    return result;
  }

  async runAll(userId: string): Promise<DetectResult> {
    const meters = await this.metersRepo.find({ where: { userId, active: true } });
    const result: DetectResult = { created: 0, escalated: 0, autoResolved: 0 };
    for (const meter of meters) {
      const r = await this.detectMeter(userId, meter);
      result.created += r.created;
      result.escalated += r.escalated;
      result.autoResolved += r.autoResolved;
    }
    return result;
  }

  /** Pico: última lectura > media + sigma*σ (media/σ móvil de las últimas 30 lecturas). <10 lecturas → sin evaluación. */
  private async detectSpike(
    userId: string,
    meter: Meter,
    reading: Reading,
  ): Promise<{ created: number; escalated: number }> {
    const result = { created: 0, escalated: 0 };
    const history = await this.readingsRepo.find({
      where: { meterId: meter.id },
      order: { periodStart: 'ASC' },
    });
    if (history.length < 10) return result;
    const idx = history.findIndex((r) => r.id === reading.id);
    if (idx < 0) return result;
    const window = history.slice(Math.max(0, idx - 29), idx);
    if (window.length < 10) return result;
    const values = window.map((r) => Number(r.value));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - avg) * (b - avg), 0) / values.length;
    const sd = Math.sqrt(variance);
    if (sd <= 0) return result;
    const value = Number(reading.value);
    const z = (value - avg) / sd;
    if (z <= 2.5) return result; // sin falsos positivos
    const severity: AnomalySeverity = z > 4 ? 'critical' : 'warning';
    const existing = await this.anomaliesRepo.findOne({
      where: { meterId: meter.id, type: 'spike', readingId: reading.id },
    });
    if (!existing) {
      const anomaly = this.anomaliesRepo.create({
        userId,
        meterId: meter.id,
        readingId: reading.id,
        type: 'spike',
        severity,
        expectedValue: round(avg, 3),
        actualValue: value,
        deviationPct: round(((value - avg) / avg) * 100, 1),
        detectedAt: new Date(),
      } as any);
      await this.anomaliesRepo.save(anomaly);
      result.created++;
    } else if (existing.severity !== severity) {
      existing.severity = severity;
      await this.anomaliesRepo.save(existing);
      result.escalated++;
    }
    return result;
  }

  /** Sostenido alto: 3+ días consecutivos con value > avg + 2σ. */
  private async detectSustainedHigh(userId: string, meter: Meter, readings: Reading[]): Promise<number> {
    if (readings.length < 13) return 0;
    let created = 0;
    // Agrupar por día
    const byDay = new Map<string, number>();
    for (const r of readings) {
      const key = r.periodStart.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + Number(r.value));
    }
    const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (days.length < 13) return 0;
    const values = days.map(([, v]) => v);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - avg) * (b - avg), 0) / values.length;
    const sd = Math.sqrt(variance);
    if (sd <= 0) return 0;
    const threshold = avg + 2 * sd;
    let streak = 0;
    for (const [day, v] of days) {
      if (v > threshold) {
        streak++;
      } else {
        streak = 0;
      }
      if (streak >= 3) {
        const existing = await this.anomaliesRepo.findOne({
          where: { meterId: meter.id, type: 'sustained_high', note: day },
        });
        if (!existing) {
          const anomaly = this.anomaliesRepo.create({
            userId,
            meterId: meter.id,
            readingId: null,
            type: 'sustained_high',
            severity: 'warning',
            expectedValue: round(avg, 3),
            actualValue: round(v, 3),
            deviationPct: round(((v - avg) / avg) * 100, 1),
            detectedAt: new Date(),
            note: day,
          } as any);
          await this.anomaliesRepo.save(anomaly);
          created++;
        }
        streak = 0;
      }
    }
    return created;
  }

  /** Sin datos: contador activo sin lecturas >= 48h (warning) / >= 72h (critical, escala sin duplicar). */
  private async detectNoData(
    userId: string,
    meter: Meter,
    readings: Reading[],
  ): Promise<{ created: number; escalated: number }> {
    const result = { created: 0, escalated: 0 };
    if (!meter.active) return result; // contador inactivo: nunca se evalúa
    const now = Date.now();
    const last = readings[readings.length - 1];
    const lastTs = new Date(last.periodStart).getTime();
    const hours = (now - lastTs) / 3600000;
    if (hours < 48) return result;
    const severity: AnomalySeverity = hours >= 72 ? 'critical' : 'warning';
    const existing = await this.anomaliesRepo.findOne({
      where: { meterId: meter.id, type: 'no_data', resolvedAt: IsNull() },
    });
    if (!existing) {
      const anomaly = this.anomaliesRepo.create({
        userId,
        meterId: meter.id,
        readingId: null,
        type: 'no_data',
        severity,
        expectedValue: null,
        actualValue: null,
        deviationPct: null,
        detectedAt: new Date(),
        note: `Sin lecturas desde ${last.periodStart.toISOString()}`,
      } as any);
      await this.anomaliesRepo.save(anomaly);
      result.created++;
    } else if (existing.severity !== severity && severity === 'critical') {
      existing.severity = 'critical';
      existing.note = `Sin lecturas desde ${last.periodStart.toISOString()} (>72h)`;
      await this.anomaliesRepo.save(existing);
      result.escalated++;
    }
    return result;
  }

  /** Fuga: 3 noches consecutivas con consumo en ventana silenciosa >= 0.5 unidades (agua/gas). */
  private async detectLeak(userId: string, meter: Meter, readings: Reading[]): Promise<number> {
    if (meter.utilityType === 'electricity') return 0;
    const unit = UTILITY_UNITS[meter.utilityType];
    void unit;
    // Estimación: lecturas que caen en 02:00-05:00 (periodo nocturno) con consumo medio >= 0.5
    const nightReadings = readings.filter((r) => {
      const h = new Date(r.periodStart).getHours();
      return h >= 2 && h < 5;
    });
    if (nightReadings.length < 3) return 0;
    // 3 noches consecutivas: agrupar por día
    const byDay = new Map<string, number>();
    for (const r of nightReadings) {
      const key = r.periodStart.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + Number(r.value));
    }
    const days = [...byDay.keys()].sort();
    let created = 0;
    let streak = 0;
    for (let i = 0; i < days.length; i++) {
      const v = byDay.get(days[i]) ?? 0;
      const prev = i > 0 ? new Date(days[i - 1]) : null;
      const cur = new Date(days[i]);
      const gap = prev ? (cur.getTime() - prev.getTime()) / 86400000 : 1;
      if (v >= 0.5 && gap <= 1.5) {
        streak++;
      } else {
        streak = 0;
      }
      if (streak >= 3) {
        const existing = await this.anomaliesRepo.findOne({
          where: { meterId: meter.id, type: 'leak', note: days[i] },
        });
        if (!existing) {
          const anomaly = this.anomaliesRepo.create({
            userId,
            meterId: meter.id,
            readingId: null,
            type: 'leak',
            severity: 'warning',
            expectedValue: null,
            actualValue: round(v, 3),
            deviationPct: null,
            detectedAt: new Date(),
            note: `Consumo nocturno sostenido (${days[i]})`,
          } as any);
          await this.anomaliesRepo.save(anomaly);
          created++;
        }
        streak = 0;
      }
    }
    return created;
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
