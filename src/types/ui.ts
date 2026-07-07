export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface ChartDataPoint {
  year?: number;
  count: number;
  label?: string;
}

export interface JournalDistribution {
  journal: string;
  count: number;
}
