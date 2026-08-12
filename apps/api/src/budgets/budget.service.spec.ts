import { BudgetService } from '../budgets/budget.service';
import { Budget } from '../entities/budget.entity';
import { Tariff } from '../entities/tariff.entity';
import { TariffService } from '../tariffs/tariff.service';

describe('BudgetService states', () => {
  const tariff = {
    id: 't1',
    utilityType: 'electricity',
    unitPrice: 0.15,
    fixedFee: 3.1,
    tiers: null,
    peakOffPeak: null,
    active: true,
  } as Tariff;

  const tariffService = new TariffService({} as any, {} as any);

  const budget = (amount: number): Budget =>
    ({ id: 'b1', userId: 'u1', meterId: 'm1', period: '2026-08-01', amount } as Budget);

  /** Crea un repo de lecturas mock que devuelve N lecturas diarias de valor v en agosto 2026. */
  const makeReadingsRepo = (n: number, v: number): any => {
    const readings = Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      meterId: 'm1',
      periodStart: new Date(`2026-08-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
      periodEnd: new Date(`2026-08-${String(i + 1).padStart(2, '0')}T23:59:00Z`),
      value: v,
    }));
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(readings),
    };
    return { createQueryBuilder: jest.fn(() => qb) };
  };

  it('US-15-1: 40.80€ gastados de 60€ a día 12 de 31 → at_risk (proyección 105.4 > 60)', async () => {
    // 12 lecturas de 20.94 kWh × 0.15 = 37.7 + cuota fija 3.1 = 40.8
    const service = new BudgetService({} as any, {} as any, makeReadingsRepo(12, 20.94) as any, tariffService);
    const meter = { id: 'm1', tariff } as any;
    const result = await (service as any).withStatus('u1', budget(60), meter);
    expect(result.spent).toBeCloseTo(40.8, 1);
    expect(result.usedPct).toBeCloseTo(68, 0);
    expect(result.projection).toBeGreaterThan(60);
    expect(result.status).toBe('at_risk');
  });

  it('US-15-2: coste acumulado menor que presupuesto y proyección menor → on_track', async () => {
    // 3 lecturas de 5 kWh × 0.15 = 2.25 + 3.1 = 5.35 → proyección 5.35/12*31 = 13.8 < 60
    const service = new BudgetService({} as any, {} as any, makeReadingsRepo(3, 5) as any, tariffService);
    const meter = { id: 'm1', tariff } as any;
    const result = await (service as any).withStatus('u1', budget(60), meter);
    expect(result.status).toBe('on_track');
    expect(result.usedPct).toBeLessThan(20);
  });

  it('US-15-3: coste > presupuesto → exceeded (barra al 100%)', async () => {
    // 8 lecturas de 60 kWh × 0.15 = 72 + 3.1 = 75.1 > 60
    const service = new BudgetService({} as any, {} as any, makeReadingsRepo(8, 60) as any, tariffService);
    const meter = { id: 'm1', tariff } as any;
    const result = await (service as any).withStatus('u1', budget(60), meter);
    expect(result.status).toBe('exceeded');
    expect(result.spent).toBeGreaterThan(60);
  });

  it('US-15-4: presupuesto sin tarifa asignada → spent 0 (no "gratis")', async () => {
    const service = new BudgetService({} as any, {} as any, makeReadingsRepo(5, 10) as any, tariffService);
    const meter = { id: 'm1', tariff: null } as any;
    const result = await (service as any).withStatus('u1', budget(60), meter);
    expect(result.spent).toBe(0);
    expect(result.status).toBe('on_track');
  });

  it('US-15-5: UNIQUE(meter_id, period) — crear presupuesto duplicado → 409 BUDGET_PERIOD_DUPLICATE', async () => {
    const budgetsRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'b1' }),
      create: jest.fn((e: any) => e),
      save: jest.fn(),
    };
    const metersRepo = { findOne: jest.fn().mockResolvedValue({ id: 'm1', userId: 'u1' }) };
    const service = new BudgetService(budgetsRepo as any, metersRepo as any, {} as any, tariffService);
    await expect(
      service.create('u1', { meterId: 'm1', period: '2026-08-01', amount: 50 }),
    ).rejects.toThrow('BUDGET_PERIOD_DUPLICATE');
  });

  it('US-15-6: amount <= 0 → BadRequest', async () => {
    const budgetsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((e: any) => e),
      save: jest.fn(),
    };
    const metersRepo = { findOne: jest.fn().mockResolvedValue({ id: 'm1', userId: 'u1' }) };
    const service = new BudgetService(budgetsRepo as any, metersRepo as any, {} as any, tariffService);
    await expect(
      service.create('u1', { meterId: 'm1', period: '2026-08-01', amount: 0 }),
    ).rejects.toThrow('AMOUNT_MUST_BE_POSITIVE');
  });
});
