export type UtilityType = 'electricity' | 'water' | 'gas';
export type AnomalyType = 'spike' | 'surge' | 'no_data' | 'inactive' | 'device_usage';
export type AnomalySeverity = 'info' | 'warning' | 'critical';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  currency: string;
  timezone: string;
  co2Factors: { electricity: number; water: number; gas: number };
  prefs: {
    spikeThresholdSigma: number;
    quietWindow: { start: string; end: string };
    quietWindowEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Tier {
  upTo?: number;
  price: number;
}

export interface PeakOffPeak {
  enabled: boolean;
  peakHours: [number, number][];
  peakPrice: number;
  offPeakPrice: number;
}

export interface Tariff {
  id: string;
  name: string;
  utilityType: UtilityType;
  currency: string;
  unitPrice: number;
  fixedFee: number;
  tiers: Tier[] | null;
  peakOffPeak: PeakOffPeak | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  inUse?: boolean;
  meterCount?: number;
}

export interface Reading {
  id: string;
  meterId: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  source: 'manual' | 'import' | 'api';
  notes: string | null;
  createdAt: string;
}

export interface LastReading {
  id: string;
  periodStart: string;
  value: number;
}

export interface Meter {
  id: string;
  name: string;
  utilityType: UtilityType;
  location: string | null;
  serialNumber: string | null;
  tariffId: string | null;
  tariff?: Tariff | null;
  active: boolean;
  unit?: string;
  lastReading?: LastReading | null;
  monthConsumption?: number;
  monthCost?: number;
  openAnomalies?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface Series {
  points: SeriesPoint[];
  unit: string;
}

export interface MeterStats {
  period: string;
  consumption: number;
  cost: number;
  prevPeriod: number;
  prevCost: number;
  deltaPct: number;
  unit: string;
}

export interface Budget {
  id: string;
  meterId: string;
  meterName?: string;
  period: string;
  amount: number;
  spent?: number;
  usedPct?: number;
  projection?: number;
  status?: 'on_track' | 'at_risk' | 'exceeded';
  createdAt: string;
  updatedAt: string;
}

export interface Anomaly {
  id: string;
  meterId: string;
  meter?: { id: string; name: string; utilityType: UtilityType };
  readingId: string | null;
  type: AnomalyType;
  severity: AnomalySeverity;
  detectedAt: string;
  expectedValue: number | null;
  actualValue: number | null;
  deviationPct: number | null;
  resolvedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
}

export interface Device {
  id: string;
  meterId: string;
  meter?: { id: string; name: string; utilityType: UtilityType };
  name: string;
  wattage: number;
  hoursPerDay: number;
  active: boolean;
  kwhPerDay?: number;
  sharePct?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Kpi {
  label: string;
  value: number;
  unit: string;
  deltaPct: number | null;
  utilityType?: UtilityType;
  mono?: boolean;
}

/** KPI crudo del dashboard API (campos del backend). */
export interface RawKpi {
  utility: UtilityType;
  label: string;
  unit: string;
  today: number;
  month: number;
  monthCost: number;
  deltaPct: number;
}

export interface BudgetGlobal {
  amount: number;
  spent: number;
  usedPct: number;
  projection: number;
  status: 'on_track' | 'at_risk' | 'exceeded';
}

export interface DashboardSummary {
  kpis: Kpi[];
  budgetGlobal: BudgetGlobal;
  anomaliesOpen: Anomaly[];
  recentReadings: Array<Reading & { meterName?: string; utility?: UtilityType; unit?: string }>;
  currency: string;
}

export interface ReportUtility {
  utility: UtilityType;
  label: string;
  unit: string;
  meterId: string;
  meterName: string;
  consumption: number;
  cost: number;
  co2: number;
}

export interface Report {
  year: number;
  month: number;
  monthLabel: string;
  totalConsumption: number;
  totalCost: number;
  co2: number;
  currency: string;
  byUtility: ReportUtility[];
  yoy: Array<{ month: string; value: number }>;
  dataSince: number;
}

export interface DetectResult {
  created: number;
  escalated: number;
  autoResolved: number;
}
