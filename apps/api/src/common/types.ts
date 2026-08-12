// Tipos compartidos del dominio energético

export type UtilityType = 'electricity' | 'water' | 'gas';
export type ReadingSource = 'manual' | 'import' | 'api';
export type AnomalyType = 'spike' | 'sustained_high' | 'no_data' | 'leak';
export type AnomalySeverity = 'info' | 'warning' | 'critical';
export type BudgetStatus = 'on_track' | 'at_risk' | 'exceeded';

export interface Tier {
  /** Límite superior del tramo (inclusive). Ausente en el último tramo = abierto. */
  upTo?: number;
  price: number;
}

export interface PeakOffPeak {
  enabled: boolean;
  /** Ventanas punta [inicio, fin) — horas 0-23, pueden cruzar medianoche (ej. [23,7]) */
  peakHours: [number, number][];
  peakPrice: number;
  offPeakPrice: number;
}

export interface Co2Factors {
  electricity: number;
  water: number;
  gas: number;
}

export interface QuietWindow {
  start: string; // '02:00'
  end: string; // '05:00'
}

export interface UserPrefs {
  spikeThresholdSigma: number;
  quietWindow: QuietWindow;
  quietWindowEnabled: boolean;
}

export const UTILITY_UNITS: Record<UtilityType, string> = {
  electricity: 'kWh',
  water: 'm³',
  gas: 'm³',
};

export const UTILITY_LABELS: Record<UtilityType, string> = {
  electricity: 'Electricidad',
  water: 'Agua',
  gas: 'Gas',
};

export const DEFAULT_CO2_FACTORS: Co2Factors = {
  electricity: 0.21,
  water: 0.34,
  gas: 2.04,
};

export const DEFAULT_PREFS: UserPrefs = {
  spikeThresholdSigma: 2.5,
  quietWindow: { start: '02:00', end: '05:00' },
  quietWindowEnabled: true,
};
