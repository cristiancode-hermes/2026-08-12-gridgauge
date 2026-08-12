import { Tariff } from '../entities/tariff.entity';
import { TariffService } from '../tariffs/tariff.service';
import { PeakOffPeak, Tier } from '../common/types';

describe('TariffService.calculateCost', () => {
  let service: TariffService;
  // Repos mockeado — calculateCost no usa repos, solo el objeto tarifa
  beforeEach(() => {
    service = new TariffService({} as any, {} as any);
  });

  const baseTariff = (overrides: Partial<Tariff> = {}): Tariff =>
    ({
      id: 't1',
      userId: 'u1',
      name: 'Test',
      utilityType: 'electricity',
      currency: 'EUR',
      unitPrice: 0.15,
      fixedFee: 0,
      tiers: null,
      peakOffPeak: null,
      active: true,
      ...overrides,
    }) as Tariff;

  const period = (start: string, end: string): [Date, Date] => [new Date(start), new Date(end)];

  it('US-09-1: tramos progresivos — 214 kWh a [0-100:0.15, 100-250:0.17, >250:0.20] = 40.50 €', () => {
    const tiers: Tier[] = [
      { upTo: 100, price: 0.15 },
      { upTo: 250, price: 0.17 },
      { price: 0.2 },
    ];
    const tariff = baseTariff({ tiers });
    const [s, e] = period('2026-08-01T00:00:00Z', '2026-08-31T23:59:00Z');
    const result = service.calculateCost(tariff, 214, s, e);
    expect(result.variable).toBeCloseTo(100 * 0.15 + 114 * 0.17, 2); // 15 + 19.38 = 34.38
  });

  it('US-09-2: consumo exactamente en el límite (100 kWh) pertenece al tramo inferior → 15.00 €', () => {
    const tiers: Tier[] = [
      { upTo: 100, price: 0.15 },
      { upTo: 250, price: 0.17 },
      { price: 0.2 },
    ];
    const tariff = baseTariff({ tiers });
    const [s, e] = period('2026-08-01T00:00:00Z', '2026-08-31T23:59:00Z');
    const result = service.calculateCost(tariff, 100, s, e);
    expect(result.variable).toBeCloseTo(15.0, 2);
  });

  it('US-09-3: consumo 0 → coste variable 0 €', () => {
    const tariff = baseTariff({ unitPrice: 0.3 });
    const [s, e] = period('2026-08-01T00:00:00Z', '2026-08-31T23:59:00Z');
    const result = service.calculateCost(tariff, 0, s, e);
    expect(result.variable).toBe(0);
    expect(result.total).toBe(0);
  });

  it('US-09-4: tramo sin upTo final (abierto) — todo lo que excede usa su precio', () => {
    const tiers: Tier[] = [
      { upTo: 100, price: 0.1 },
      { price: 0.3 },
    ];
    const tariff = baseTariff({ tiers });
    const [s, e] = period('2026-08-01T00:00:00Z', '2026-08-31T23:59:00Z');
    const result = service.calculateCost(tariff, 250, s, e);
    expect(result.variable).toBeCloseTo(100 * 0.1 + 150 * 0.3, 2); // 10 + 45 = 55
  });

  it('US-09-5: validación — tramos con límites no crecientes → BadRequest', () => {
    const tiers: Tier[] = [
      { upTo: 200, price: 0.1 },
      { upTo: 100, price: 0.2 },
    ];
    const tariff = baseTariff({ tiers });
    expect(() => {
      (service as any).validateTariff({ unitPrice: 0.1, tiers } as any);
    }).toThrow();
  });

  it('US-10-1: ventana punta [23,7) que cruza medianoche — 8h punta / 16h valle en lectura diaria', () => {
    const peak: PeakOffPeak = {
      enabled: true,
      peakHours: [[23, 7]],
      peakPrice: 0.84,
      offPeakPrice: 0.61,
    };
    const tariff = baseTariff({ utilityType: 'gas', peakOffPeak: peak });
    const [s, e] = period('2026-08-12T00:00:00Z', '2026-08-12T23:59:00Z');
    const result = service.calculateCost(tariff, 24, s, e);
    // 8/24 punta, 16/24 valle
    const expected = (8 / 24) * 24 * 0.84 + (16 / 24) * 24 * 0.61;
    expect(result.variable).toBeCloseTo(expected, 1);
    expect(result.peakOffPeakApplied).not.toBeNull();
    expect(result.peakOffPeakApplied!.peakUnits).toBeCloseTo(8, 1);
  });

  it('US-10-2: ventana [7,23) sin cruce — 16h punta / 8h valle', () => {
    const peak: PeakOffPeak = {
      enabled: true,
      peakHours: [[7, 23]],
      peakPrice: 0.84,
      offPeakPrice: 0.61,
    };
    const tariff = baseTariff({ peakOffPeak: peak });
    const [s, e] = period('2026-08-12T00:00:00Z', '2026-08-12T23:59:00Z');
    const result = service.calculateCost(tariff, 24, s, e);
    const expected = (16 / 24) * 24 * 0.84 + (8 / 24) * 24 * 0.61;
    expect(result.variable).toBeCloseTo(expected, 1);
  });

  it('US-10-4: peak_off_peak.enabled=false → precio base unit_price', () => {
    const peak: PeakOffPeak = {
      enabled: false,
      peakHours: [[23, 7]],
      peakPrice: 0.84,
      offPeakPrice: 0.61,
    };
    const tariff = baseTariff({ unitPrice: 0.15, peakOffPeak: peak });
    const [s, e] = period('2026-08-12T00:00:00Z', '2026-08-12T23:59:00Z');
    const result = service.calculateCost(tariff, 10, s, e);
    expect(result.variable).toBeCloseTo(10 * 0.15, 2);
    expect(result.peakOffPeakApplied).toBeNull();
  });

  it('US-11-2: cuota fija se añade una vez por mes con lecturas (no en calculateCost por lectura)', () => {
    const tariff = baseTariff({ unitPrice: 0.15, fixedFee: 3.1 });
    const [s, e] = period('2026-08-01T00:00:00Z', '2026-08-01T23:59:00Z');
    const result = service.calculateCost(tariff, 20, s, e);
    expect(result.variable).toBeCloseTo(3.0, 2); // 20 × 0.15
    expect(result.fixedFee).toBe(0); // la cuota fija se añade a nivel de mes, no por lectura
  });
});
