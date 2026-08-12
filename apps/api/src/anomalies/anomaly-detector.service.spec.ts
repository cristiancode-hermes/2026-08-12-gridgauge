import { AnomalyDetectorService } from './anomaly-detector.service';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';

describe('AnomalyDetectorService', () => {
  let detector: AnomalyDetectorService;
  let saved: any[] = [];

  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn(async (e: any) => {
      saved.push(e);
      return e;
    }),
    create: jest.fn((e: any) => e),
  });

  const meter = (overrides: Partial<Meter> = {}): Meter =>
    ({ id: 'm1', userId: 'u1', utilityType: 'electricity', active: true, ...overrides }) as Meter;

  const reading = (id: string, value: number, daysAgo: number): Reading =>
    ({
      id,
      meterId: 'm1',
      value,
      periodStart: new Date(Date.now() - daysAgo * 86400000),
      periodEnd: new Date(Date.now() - daysAgo * 86400000 + 3600000),
    }) as Reading;

  beforeEach(() => {
    saved = [];
    const readingsRepo = mockRepo();
    detector = new AnomalyDetectorService(mockRepo() as any, mockRepo() as any, readingsRepo as any);
  });

  it('US-12-1: lectura +38% (>2.5σ) genera spike warning con expected/actual/deviation', async () => {
    const history: Reading[] = [];
    for (let i = 1; i <= 30; i++) history.push(reading(`r${i}`, 9.3 + Math.sin(i) * 1.7, i));
    const spike = reading('r31', 12.8, 0);
    (detector as any).readingsRepo.find.mockResolvedValue([...history, spike]);
    const result = await (detector as any).detectSpike('u1', meter(), spike);
    expect(result.created).toBe(1);
    expect(saved.length).toBe(1);
    expect(saved[0].type).toBe('spike');
    expect(saved[0].severity).toBe('warning');
    expect(saved[0].actualValue).toBe(12.8);
    expect(saved[0].expectedValue).toBeGreaterThan(8);
    expect(saved[0].expectedValue).toBeLessThan(11);
    expect(saved[0].deviationPct).toBeGreaterThan(20);
  });

  it('US-12-2: lectura +20% (<2.5σ) NO genera anomalía (sin falsos positivos)', async () => {
    const history: Reading[] = [];
    for (let i = 1; i <= 30; i++) history.push(reading(`r${i}`, 9.3 + Math.sin(i) * 1.7, i));
    const normal = reading('r31', 11.2, 0);
    (detector as any).readingsRepo.find.mockResolvedValue([...history, normal]);
    const result = await (detector as any).detectSpike('u1', meter(), normal);
    expect(result.created).toBe(0);
  });

  it('US-12-3: con <10 lecturas previas no se evalúa spike', async () => {
    const history: Reading[] = [];
    for (let i = 1; i <= 5; i++) history.push(reading(`r${i}`, 9.3, i));
    const spike = reading('r6', 50, 0);
    (detector as any).readingsRepo.find.mockResolvedValue([...history, spike]);
    const result = await (detector as any).detectSpike('u1', meter(), spike);
    expect(result.created).toBe(0);
  });

  it('US-12-4: idempotente — re-ejecutar no duplica (findOne devuelve existente)', async () => {
    const history: Reading[] = [];
    for (let i = 1; i <= 30; i++) history.push(reading(`r${i}`, 9.3 + Math.sin(i) * 1.7, i));
    const spike = reading('r31', 12.8, 0);
    (detector as any).readingsRepo.find.mockResolvedValue([...history, spike]);
    // findOne devuelve una anomalía existente → no crea
    detector = new AnomalyDetectorService(
      mockRepo() as any,
      mockRepo() as any,
      { find: jest.fn().mockResolvedValue(history), findOne: jest.fn().mockResolvedValue({ id: 'a1', severity: 'warning' }), save: jest.fn() } as any,
    );
    const result = await (detector as any).detectSpike('u1', meter(), spike);
    expect(result.created).toBe(0);
    expect(result.escalated).toBe(0);
  });

  it('US-13-1: contador activo sin lecturas en 48h → no_data warning', async () => {
    const old = reading('r1', 9.3, 2.2); // hace ~53h → warning (48-72h)
    const readings = [old];
    (detector as any).readingsRepo.find.mockResolvedValue(readings);
    const result = await (detector as any).detectNoData('u1', meter(), readings);
    expect(result.created).toBe(1);
    expect(saved[0].type).toBe('no_data');
    expect(saved[0].severity).toBe('warning');
  });

  it('US-13-2: a las 72h escala a critical sin duplicar', async () => {
    const old = reading('r1', 9.3, 4); // hace 4 días (>72h)
    const readings = [old];
    const existing = { id: 'a1', severity: 'warning', note: 'Sin lecturas' };
    const saveMock = jest.fn(async (e: any) => e);
    const detector2 = new AnomalyDetectorService(
      {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(existing),
        save: saveMock,
      } as any,
      mockRepo() as any,
      { find: jest.fn().mockResolvedValue(readings) } as any,
    );
    const result = await (detector2 as any).detectNoData('u1', meter(), readings);
    expect(result.created).toBe(0);
    expect(result.escalated).toBe(1);
    expect(existing.severity).toBe('critical');
  });

  it('US-13-3: contador inactivo nunca evalúa no_data', async () => {
    const old = reading('r1', 9.3, 10);
    const readings = [old];
    const result = await (detector as any).detectNoData('u1', meter({ active: false }), readings);
    expect(result.created).toBe(0);
  });
});
